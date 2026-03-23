const BASIC_GATE_TYPES = ['NOT', 'AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR', 'BUFFER'];
const BASIC_IN_COUNT  = { NOT:1, BUFFER:1, AND:2, OR:2, NAND:2, NOR:2, XOR:2, XNOR:2 };
const BASIC_OUT_COUNT = { NOT:1, BUFFER:1, AND:1, OR:1, NAND:1, NOR:1, XOR:1, XNOR:1 };

function evalBasicGate(type, v) {
  const a = v[0], b = v[1];
  if (type === 'NOT')    return [a ? 0 : 1];
  if (type === 'BUFFER') return [a];
  if (type === 'AND')    return [a & b];
  if (type === 'OR')     return [a | b];
  if (type === 'NAND')   return [(a & b) ? 0 : 1];
  if (type === 'NOR')    return [(a | b) ? 0 : 1];
  if (type === 'XOR')    return [a ^ b];
  if (type === 'XNOR')   return [(a ^ b) ? 0 : 1];
  return [0];
}

function drawPort(p, x, y, ptype, val, COLORS) {
  const PR = 8;
  const col = (ptype === 'in') ? COLORS.portIn : COLORS.portOut;
  p.noStroke();
  if (val) {
    p.fill(col[0], col[1], col[2], 60);
    p.circle(x, y, PR * 3);
  }
  p.stroke(col[0], col[1], col[2]);
  p.strokeWeight(1.5);
  p.fill(COLORS.bg[0], COLORS.bg[1], COLORS.bg[2]);
  p.circle(x, y, PR * 2);
  p.noStroke();
  p.fill(col[0], col[1], col[2]);
  p.circle(x, y, PR);
}

function drawGateSymbol(p, node, COLORS) {
  const { x, y, w, h, type, outputVals } = node;
  const on = outputVals[0];
  const gx = x + 14, gy = y + h / 2 - 16, gw = 36, gh = 32;

  p.fill(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2], 40);
  p.stroke(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2], on ? 180 : 80);
  p.strokeWeight(1.8);

  if (type === 'AND' || type === 'NAND') {
    p.rect(gx, gy, gw * 0.6, gh);
    p.arc(gx + gw * 0.6, gy + gh / 2, gh, gh, -p.HALF_PI, p.HALF_PI);
    if (type === 'NAND') {
      p.fill(COLORS.nodeBody[0], COLORS.nodeBody[1], COLORS.nodeBody[2]);
      p.stroke(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2], on ? 180 : 80);
      p.circle(gx + gw + 7, gy + gh / 2, 8);
    }
  } else if (['OR','NOR','XOR','XNOR'].includes(type)) {
    p.beginShape();
    p.vertex(gx, gy);
    p.bezierVertex(gx+gw*0.7, gy-8,     gx+gw, gy+8,        gx+gw, gy+gh/2);
    p.bezierVertex(gx+gw,     gy+gh-8,  gx+gw*0.7, gy+gh+8, gx,    gy+gh);
    p.bezierVertex(gx+gw*0.35, gy+gh/2, gx+gw*0.35, gy+gh/2, gx,   gy);
    p.endShape();
    if (type === 'XOR' || type === 'XNOR') {
      p.noFill();
      p.arc(gx - 10, gy + gh / 2, 20, gh, -p.HALF_PI, p.HALF_PI);
    }
    if (type === 'NOR' || type === 'XNOR') {
      p.fill(COLORS.nodeBody[0], COLORS.nodeBody[1], COLORS.nodeBody[2]);
      p.stroke(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2], on ? 180 : 80);
      p.circle(gx + gw + 7, gy + gh / 2, 8);
    }
  } else if (type === 'NOT') {
    p.triangle(gx, gy, gx, gy + gh, gx + gw, gy + gh / 2);
    p.fill(COLORS.nodeBody[0], COLORS.nodeBody[1], COLORS.nodeBody[2]);
    p.circle(gx + gw + 7, gy + gh / 2, 8);
  } else if (type === 'BUFFER') {
    p.triangle(gx, gy, gx, gy + gh, gx + gw, gy + gh / 2);
  }
}

function drawBasicGate(p, node, COLORS, inputPortPos, outputPortPos) {
  const { x, y, w, h, type } = node;

  p.drawingContext.shadowColor = 'rgba(0,180,255,0.15)';
  p.drawingContext.shadowBlur  = 14;

  p.fill(COLORS.nodeBody[0], COLORS.nodeBody[1], COLORS.nodeBody[2]);
  p.stroke(COLORS.nodeBorder[0], COLORS.nodeBorder[1], COLORS.nodeBorder[2]);
  p.strokeWeight(1.5);
  p.rect(x, y, w, h, 6);
  p.drawingContext.shadowBlur = 0;

  drawGateSymbol(p, node, COLORS);

  p.noStroke();
  p.fill(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(13);
  p.textStyle(p.BOLD);
  p.text(type, x + w / 2, y + h + 12);
  p.textStyle(p.NORMAL);

  const cnt = BASIC_IN_COUNT[type] || 0;
  for (let i = 0; i < cnt; i++) {
    const pp = inputPortPos(node, i);
    drawPort(p, pp.x, pp.y, 'in', node.inputVals[i], COLORS);
  }

  const op = outputPortPos(node, 0);
  drawPort(p, op.x, op.y, 'out', node.outputVals[0], COLORS);
}
