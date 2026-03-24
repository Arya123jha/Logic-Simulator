// Adders, Subtractors and Input Switch
// Half Adder, Full Adder, Half Subtractor, Full Subtractor
// input toggle switch drawing

const COMPOUND_GATE_TYPES = ['HALF_ADDER', 'FULL_ADDER', 'HALF_SUB', 'FULL_SUB'];

const COMPOUND_IN_COUNT = {
  HALF_ADDER:2, FULL_ADDER:3,
  HALF_SUB:2,   FULL_SUB:3,
};
const COMPOUND_OUT_COUNT = {
  HALF_ADDER:2, FULL_ADDER:2,
  HALF_SUB:2,   FULL_SUB:2,
};

const COMPOUND_IN_LABELS = {
  HALF_ADDER:['A','B'],      FULL_ADDER:['A','B','Cin'],
  HALF_SUB:  ['A','B'],      FULL_SUB:  ['A','B','Bin'],
};
const COMPOUND_OUT_LABELS = {
  HALF_ADDER:['SUM','CRY'],  FULL_ADDER:['SUM','CRY'],
  HALF_SUB:  ['DIF','BRW'],  FULL_SUB:  ['DIF','BRW'],
};

// calculate output of adders/subtractors
function evalCompoundGate(type, v) {
  const a = v[0], b = v[1], c = v[2] || 0;
  if (type === 'HALF_ADDER') {
    return [a ^ b, a & b];
  }
  if (type === 'FULL_ADDER') {
    const s1 = a ^ b;
    return [s1 ^ c, (a & b) | (s1 & c)];
  }
  if (type === 'HALF_SUB') {
    return [a ^ b, ((~a) & 1) & b];
  }
  if (type === 'FULL_SUB') {
    const x1 = a ^ b;
    return [x1 ^ c, (((~a) & 1) & b) | (((~x1) & 1) & c)];
  }
  return [0, 0];
}

// draw adder/subtractor block
function drawCompoundGate(p, node, COLORS, inputPortPos, outputPortPos) {
  const { x, y, w, h, type } = node;

  const anyOn = node.outputVals[0] || node.outputVals[1];
  p.drawingContext.shadowColor = anyOn ? 'rgba(255,160,0,0.25)' : 'rgba(0,180,255,0.12)';
  p.drawingContext.shadowBlur  = anyOn ? 18 : 10;

  // Body
  p.fill(22, 32, 58);
  p.stroke(80, 140, 255);
  p.strokeWeight(2);
  p.rect(x, y, w, h, 8);
  p.drawingContext.shadowBlur = 0;

  // Header bar
  p.noStroke();
  p.fill(30, 80, 180, 180);
  p.rect(x + 1, y + 1, w - 2, 22, 7, 7, 0, 0);

  // Title in header
  p.fill(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(11);
  p.textStyle(p.BOLD);
  const titles = { HALF_ADDER:'HALF ADDER', FULL_ADDER:'FULL ADDER',
                   HALF_SUB:'HALF SUB',     FULL_SUB:'FULL SUB' };
  p.text(titles[type], x + w / 2, y + 12);
  p.textStyle(p.NORMAL);

  //text in centre
  p.textSize(9);
  p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2], 120);
  const formula = (type === 'HALF_ADDER' || type === 'FULL_ADDER') ? 'XOR + AND' : 'XOR + NOT + AND';
  p.text(formula, x + w / 2, y + h / 2);

  // Live input values at bottom
  const inCnt  = COMPOUND_IN_COUNT[type];
  const inLbls = COMPOUND_IN_LABELS[type];
  p.fill(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2], 200);
  p.textAlign(p.CENTER, p.BOTTOM);
  p.textSize(10);
  let inStr = '';
  for (let ii = 0; ii < inCnt; ii++) inStr += inLbls[ii] + '=' + node.inputVals[ii] + '  ';
  p.text(inStr.trim(), x + w / 2, y + h - 4);

  // Input ports + labels
  for (let i = 0; i < inCnt; i++) {
    const pp = inputPortPos(node, i);
    drawPort(p, pp.x, pp.y, 'in', node.inputVals[i], COLORS);
    p.noStroke();
    p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2], 180);
    p.textAlign(p.LEFT, p.CENTER);
    p.textSize(10);
    p.text(inLbls[i], pp.x + 8, pp.y);
  }

  // Output ports + labels
  const outCnt  = COMPOUND_OUT_COUNT[type];
  const outLbls = COMPOUND_OUT_LABELS[type];
  for (let oi = 0; oi < outCnt; oi++) {
    const op = outputPortPos(node, oi);
    drawPort(p, op.x, op.y, 'out', node.outputVals[oi], COLORS);
    p.noStroke();
    p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2], 180);
    p.textAlign(p.RIGHT, p.CENTER);
    p.textSize(10);
    p.text(outLbls[oi], op.x - 8, op.y);
  }
}

// draw input toggle switch
function drawInputSwitch(p, node, COLORS, outputPortPos) {
  const { x, y, w, h } = node;
  const on  = node.state;
  const col = on ? COLORS.inputOn : COLORS.inputOff;

  p.drawingContext.shadowColor = on ? 'rgba(0,255,100,0.35)' : 'rgba(200,40,40,0.2)';
  p.drawingContext.shadowBlur  = on ? 20 : 8;

  p.fill(col[0], col[1], col[2], 200);
  p.stroke(col[0], col[1], col[2]);
  p.strokeWeight(2);
  p.rect(x, y, w, h, 8);
  p.drawingContext.shadowBlur = 0;

  //show 0 or 1
  p.noStroke();
  p.fill(255);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(20);
  p.textStyle(p.BOLD);
  p.text(on ? '1' : '0', x + w / 2, y + h / 2);
  p.textStyle(p.NORMAL);

  //label below
  p.textSize(10);
  p.fill(COLORS.text[0], COLORS.text[1], COLORS.text[2], 180);
  p.text('INPUT', x + w / 2, y + h + 10);

  //small toggle bar design
  const trackY = y + h - 12;
  const trackW = w * 0.6;
  const trackX = x + (w - trackW) / 2;
  p.fill(0, 0, 0, 80);
  p.rect(trackX, trackY, trackW, 6, 3);
  const knobX = on ? trackX + trackW - 8 : trackX + 2;
  p.fill(255, 255, 255, on ? 220 : 120);
  p.rect(knobX, trackY, 8, 6, 3);

  // Output port
  const op = outputPortPos(node, 0);
  drawPort(p, op.x, op.y, 'out', on, COLORS);
}