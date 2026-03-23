// ══════════════════════════════════════════════
//  CORE ENGINE
//  LED drawing, wire routing + drawing,
//  grid, canvas setup, signal propagation,
//  node factory, hit detection, UI controls,
//  palette drag, mode switching
// ══════════════════════════════════════════════

// ── Shared colour palette ──
const COLORS = {
  bg:        [10, 14, 26],
  grid:      [20, 35, 60],
  nodeBody:  [17, 28, 50],
  nodeBorder:[30, 90,160],
  accent:    [0, 212,255],
  accent2:   [255,107, 53],
  green:     [0, 255,136],
  wire0:     [60,  80,100],
  wire1:     [0,  220,100],
  portIn:    [0,  160,255],
  portOut:   [255,140,  0],
  text:      [200,220,240],
  inputOff:  [180, 40, 40],
  inputOn:   [40, 180, 80],
  ledOff:    [80,  80, 80],
  ledOn:     [255,220,  0],
};

// ── Merged lookup tables (all types combined) ──
const IN_COUNT = {
  ...BASIC_IN_COUNT,
  ...COMPOUND_IN_COUNT,
  INPUT:0, LED:1,
};
const OUT_COUNT = {
  ...BASIC_OUT_COUNT,
  ...COMPOUND_OUT_COUNT,
  INPUT:1, LED:0,
};

// ── State ──
let nodes    = [];
let wires    = [];
let mode     = 'drag';   // 'drag' | 'wire' | 'delwire'
let wireStart = null;
let dragging  = null;
let nextId    = 1;

const PR = 8; // port radius

// ── Node factory ──
function makeNode(type, x, y) {
  const nIn  = IN_COUNT[type]  || 0;
  const nOut = OUT_COUNT[type] != null ? OUT_COUNT[type] : 1;
  const isCompound = COMPOUND_GATE_TYPES.includes(type);
  return {
    id: nextId++,
    type,
    x, y,
    w: type==='INPUT' ? 60 : type==='LED' ? 50 : isCompound ? 110 : 90,
    h: Math.max(60, Math.max(nIn, nOut) * 30 + 20),
    inputVals:  new Array(nIn).fill(0),
    outputVals: new Array(nOut).fill(0),
    state: 0,
  };
}

// ── Port position helpers ──
function inputPortPos(node, i) {
  const n = IN_COUNT[node.type] || 1;
  const spacing = node.h / (n + 1);
  return { x: node.x, y: node.y + spacing * (i + 1) };
}
function outputPortPos(node, i) {
  const n = OUT_COUNT[node.type] != null ? OUT_COUNT[node.type] : 1;
  if (n <= 1) return { x: node.x + node.w, y: node.y + node.h / 2 };
  const spacing = node.h / (n + 1);
  return { x: node.x + node.w, y: node.y + spacing * (i + 1) };
}

// ── Signal propagation (Person 3 owns the engine) ──
function evalNode(node) {
  if (node.type === 'INPUT') {
    node.outputVals[0] = node.state;
  } else if (node.type === 'LED') {
    // no outputs — inputVals[0] drives the display
  } else if (BASIC_GATE_TYPES.includes(node.type)) {
    const r = evalBasicGate(node.type, node.inputVals);
    r.forEach((v, i) => node.outputVals[i] = v);
  } else if (COMPOUND_GATE_TYPES.includes(node.type)) {
    const r = evalCompoundGate(node.type, node.inputVals);
    r.forEach((v, i) => node.outputVals[i] = v);
  }
}

function propagate() {
  for (let pass = 0; pass < 6; pass++) {
    for (const w of wires) {
      const val = w.from.outputVals[w.fromPort] ?? 0;
      w.to.inputVals[w.toPort] = val;
    }
    for (const n of nodes) evalNode(n);
  }
}

// ── Wire path: orthogonal routing ──
function wirePoints(w) {
  const from = outputPortPos(w.from, w.fromPort);
  const to   = inputPortPos(w.to,   w.toPort);
  const mx   = (from.x + to.x) / 2;
  return [
    { x: from.x, y: from.y },
    { x: mx,     y: from.y },
    { x: mx,     y: to.y   },
    { x: to.x,   y: to.y   },
  ];
}

// ── Hit detection ──
function distXY(ax,ay,bx,by) { return Math.hypot(ax-bx, ay-by); }

function distToSegment(px,py,ax,ay,bx,by) {
  const dx=bx-ax, dy=by-ay, len=dx*dx+dy*dy;
  if (!len) return distXY(px,py,ax,ay);
  const t = Math.max(0, Math.min(1, ((px-ax)*dx+(py-ay)*dy)/len));
  return distXY(px,py, ax+t*dx, ay+t*dy);
}

function hitNode(x,y) {
  for (let i=nodes.length-1; i>=0; i--) {
    const n=nodes[i];
    if (x>=n.x&&x<=n.x+n.w&&y>=n.y&&y<=n.y+n.h) return n;
  }
  return null;
}
function hitInputPort(x,y) {
  for (const n of nodes) {
    const cnt = IN_COUNT[n.type]||0;
    for (let i=0;i<cnt;i++) {
      const pp=inputPortPos(n,i);
      if (distXY(x,y,pp.x,pp.y)<PR+2) return {node:n,portIdx:i,portType:'in'};
    }
  }
  return null;
}
function hitOutputPort(x,y) {
  for (const n of nodes) {
    if (n.type==='LED') continue;
    const nOut=OUT_COUNT[n.type]??1;
    for (let oi=0;oi<nOut;oi++) {
      const pp=outputPortPos(n,oi);
      if (distXY(x,y,pp.x,pp.y)<PR+2) return {node:n,portIdx:oi,portType:'out'};
    }
  }
  return null;
}
function hitWire(x,y) {
  for (const w of wires) {
    const pts=wirePoints(w);
    for (let i=0;i<pts.length-1;i++) {
      if (distToSegment(x,y,pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y)<6) return w;
    }
  }
  return null;
}

// ══════════════════════════════════════════════
//  DRAW FUNCTIONS 
// ══════════════════════════════════════════════

// ── LED display ──
function drawLED(p, node, inputPortPos) {
  const { x, y, w, h } = node;
  const on = node.inputVals[0];
  const cx = x + w/2, cy = y + h/2;

  if (on) {
    p.drawingContext.shadowColor = 'rgba(255,220,0,0.8)';
    p.drawingContext.shadowBlur  = 30;
  }

  const col = on ? COLORS.ledOn : COLORS.ledOff;
  p.fill(col[0], col[1], col[2]);
  p.stroke(on?200:60, on?160:60, on?0:60);
  p.strokeWeight(2);
  p.circle(cx, cy, 36);
  p.drawingContext.shadowBlur = 0;

  // Specular highlight when on
  if (on) {
    p.noStroke();
    p.fill(255, 255, 200, 120);
    p.circle(cx - 5, cy - 5, 12);
  }

  // Label
  p.noStroke();
  p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2], 180);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(10);
  p.text('LED', cx, cy + 26);
  p.textSize(12);
  p.textStyle(p.BOLD);
  p.fill(on ? 0 : 200);
  p.text(on ? '1' : '0', cx, cy);
  p.textStyle(p.NORMAL);

  // Input port
  const pp = inputPortPos(node, 0);
  drawPort(p, pp.x, pp.y, 'in', on, COLORS);
}

// ── Grid background ──
function drawGrid(p, w, h) {
  p.stroke(COLORS.grid[0], COLORS.grid[1], COLORS.grid[2]);
  p.strokeWeight(0.5);
  const gs = 28;
  for (let x=0; x<w; x+=gs) p.line(x,0,x,h);
  for (let y=0; y<h; y+=gs) p.line(0,y,w,y);
}

// ── Wire drawing ──
function drawWire(p, w) {
  const pts = wirePoints(w);
  const val = w.from.outputVals[w.fromPort] ?? 0;
  const col = val ? COLORS.wire1 : COLORS.wire0;
  p.stroke(col[0], col[1], col[2]);
  p.strokeWeight(val ? 2.5 : 1.8);
  p.noFill();
  for (let i=0; i<pts.length-1; i++) p.line(pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y);
  // Corner dots
  p.noStroke();
  p.fill(col[0], col[1], col[2]);
  for (let j=1; j<pts.length-1; j++) p.circle(pts[j].x, pts[j].y, 5);
}

// ── Temp wire while drawing ──
function drawTempWire(p, from, mx, my) {
  p.stroke(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  p.strokeWeight(1.5);
  p.drawingContext.setLineDash([6,4]);
  p.line(from.x, from.y, mx, my);
  p.drawingContext.setLineDash([]);
}

// ══════════════════════════════════════════════
//  p5 SKETCH
// ══════════════════════════════════════════════
const sketch = (p) => {
  let cW, cH;
  let mouseWX = 0, mouseWY = 0;

  p.setup = function () {
    const cont = document.getElementById('sim-canvas');
    cW = cont.offsetWidth; cH = cont.offsetHeight;
    p.createCanvas(cW, cH).parent('sim-canvas');
    p.textFont('Rajdhani');
  };

  p.windowResized = function () {
    const cont = document.getElementById('sim-canvas');
    cW = cont.offsetWidth; cH = cont.offsetHeight;
    p.resizeCanvas(cW, cH);
  };

  p.draw = function () {
    propagate();
    p.background(COLORS.bg[0], COLORS.bg[1], COLORS.bg[2]);

    drawGrid(p, cW, cH);

    // Wires (Person 3)
    for (const w of wires) drawWire(p, w);
    if (wireStart) {
      const from = outputPortPos(wireStart.node, wireStart.portIdx);
      drawTempWire(p, from, mouseWX, mouseWY);
    }

    // Nodes — dispatch to each person's draw function
    for (const node of nodes) {
      if (node.type === 'LED')                         drawLED(p, node, inputPortPos);
      else if (node.type === 'INPUT')                  drawInputSwitch(p, node, COLORS, outputPortPos);
      else if (COMPOUND_GATE_TYPES.includes(node.type)) drawCompoundGate(p, node, COLORS, inputPortPos, outputPortPos);
      else if (BASIC_GATE_TYPES.includes(node.type))   drawBasicGate(p, node, COLORS, inputPortPos, outputPortPos);
    }
  };

  // ── Mouse events ──
  p.mouseMoved  = () => { mouseWX = p.mouseX; mouseWY = p.mouseY; };
  p.mouseDragged = () => {
    mouseWX = p.mouseX; mouseWY = p.mouseY;
    if (dragging && mode==='drag') {
      dragging.node.x = p.mouseX - dragging.ox;
      dragging.node.y = p.mouseY - dragging.oy;
    }
  };

  p.mousePressed = function () {
    if (p.mouseButton !== p.LEFT) return;
    const mx=p.mouseX, my=p.mouseY;

    if (mode==='wire') {
      const op=hitOutputPort(mx,my), ip=hitInputPort(mx,my);
      if (!wireStart && op) { wireStart={node:op.node,portIdx:op.portIdx}; return; }
      if (wireStart && ip) {
        const exists=wires.find(w=>w.to===ip.node&&w.toPort===ip.portIdx);
        if (!exists && ip.node!==wireStart.node)
          wires.push({from:wireStart.node,fromPort:wireStart.portIdx,to:ip.node,toPort:ip.portIdx});
        wireStart=null; return;
      }
      if (!op && !ip) wireStart=null;
      return;
    }
    if (mode==='delwire') {
      const w=hitWire(mx,my);
      if (w) wires=wires.filter(x=>x!==w);
      return;
    }

    // DRAG mode
    const n=hitNode(mx,my);
    if (n && n.type==='INPUT') n.state = 1-n.state;
    if (n) dragging={node:n, ox:mx-n.x, oy:my-n.y};
  };

  p.mouseReleased = () => { dragging=null; };
};

// ── Right-click to delete node ──
document.getElementById('sim-canvas').addEventListener('contextmenu', e => {
  e.preventDefault();
  const rect=e.currentTarget.getBoundingClientRect();
  const n=hitNode(e.clientX-rect.left, e.clientY-rect.top);
  if (n) { wires=wires.filter(w=>w.from!==n&&w.to!==n); nodes=nodes.filter(x=>x!==n); }
});

// ── Mode buttons ──
function updateModeUI() {
  const el=document.getElementById('cur-mode');
  el.textContent=mode.toUpperCase();
  el.style.color=mode==='wire'?'#ff6b35':mode==='delwire'?'#ff4444':'#00ff88';
  document.getElementById('btn-wire').style.background=mode==='wire'?'rgba(255,107,53,0.25)':'';
  document.getElementById('btn-del-wire').style.background=mode==='delwire'?'rgba(255,50,50,0.25)':'';
}
document.getElementById('btn-wire').addEventListener('click',()=>{
  mode=mode==='wire'?'drag':'wire'; wireStart=null; updateModeUI();
});
document.getElementById('btn-del-wire').addEventListener('click',()=>{
  mode=mode==='delwire'?'drag':'delwire'; wireStart=null; updateModeUI();
});
document.getElementById('btn-clear').addEventListener('click',()=>{
  nodes=[]; wires=[]; wireStart=null;
});

// ── Palette drag ──
document.querySelectorAll('.pal-item').forEach(item => {
  item.addEventListener('mousedown', e => {
    e.preventDefault();
    const rect=document.getElementById('sim-canvas').getBoundingClientRect();
    const node=makeNode(item.dataset.type, Math.max(0,e.clientX-rect.left-45), Math.max(0,e.clientY-rect.top-25));
    nodes.push(node);
    window._pendingDrag={node, ox:45, oy:25};
  });
});
document.getElementById('sim-canvas').addEventListener('mousemove', () => {
  if (window._pendingDrag) { dragging=window._pendingDrag; window._pendingDrag=null; }
});
document.addEventListener('mouseup', () => { dragging=null; window._pendingDrag=null; });

// ── Launch ──
new p5(sketch);