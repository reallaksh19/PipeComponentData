import { dimensionFacts, formatFact, weightFacts } from '../dimensionDisplay.js';

const NS = 'http://www.w3.org/2000/svg';
const LABEL_ORDER = {
  valve: ['F2F RF', 'F2F RTJ', 'BW length', 'Height', 'HW dia'],
  flange: ['OD', 'Wall / Thk', 'RF dia', 'RF height', 'PCD', 'Bolt count', 'Bolt size'],
  gasket: ['OD', 'ID', 'Wall / Thk'],
  fitting: ['C-E', 'Dev. len', 'OD', 'Wall / Thk'],
  reducer: ['C-E', 'OD', 'ID', 'Wall / Thk'],
  olet: ['OD', 'ID', 'C-E', 'Wall / Thk'],
  pipe: ['OD', 'Wall / Thk'],
};

const SLOTS = {
  f2f: { x1: 210, y1: 855, x2: 790, y2: 855, lx: 500, ly: 815, anchor: 'middle' },
  height: { x1: 850, y1: 245, x2: 850, y2: 760, lx: 820, ly: 225, anchor: 'start' },
  top: { x1: 340, y1: 145, x2: 660, y2: 145, lx: 500, ly: 105, anchor: 'middle' },
  left: { x1: 150, y1: 260, x2: 150, y2: 740, lx: 180, ly: 235, anchor: 'start' },
  mid: { x1: 270, y1: 720, x2: 730, y2: 720, lx: 500, ly: 680, anchor: 'middle' },
  badge1: { lx: 760, ly: 105, anchor: 'start' },
  badge2: { lx: 760, ly: 155, anchor: 'start' },
  badge3: { lx: 760, ly: 205, anchor: 'start' },
};

export function renderDimensionCallouts(row, symbol, canvas) {
  if (!canvas) return [];
  clearDimensionCallouts(canvas);
  const callouts = buildCallouts(row, symbol);
  if (!callouts.length) return [];
  const layer = svgNode('svg', {
    class: 'dimension-callout-layer',
    viewBox: '0 0 1000 1000',
    preserveAspectRatio: 'none',
    'aria-label': 'Source-backed DB dimension callouts',
  });
  layer.append(defs());
  callouts.forEach((callout) => layer.append(calloutNode(callout)));
  canvas.append(layer);
  return callouts;
}

export function clearDimensionCallouts(canvas = document.querySelector('.source-svg-canvas')) {
  canvas?.querySelectorAll?.('.dimension-callout-layer').forEach((node) => node.remove());
}

function buildCallouts(row = {}, symbol = {}) {
  const family = String(symbol.family || row.componentType || row.component || '').toLowerCase();
  const dimensions = new Map(dimensionFacts(row).map((fact) => [fact.label, fact]));
  const weights = weightFacts(row);
  const ordered = (LABEL_ORDER[family] || LABEL_ORDER.fitting).map((label) => dimensions.get(label)).filter(Boolean);
  const calls = [];
  const f2f = firstFact(ordered, ['F2F RF', 'F2F RTJ', 'BW length', 'C-E', 'Dev. len']);
  const height = firstFact(ordered, ['Height']);
  const top = firstFact(ordered, ['HW dia', 'OD', 'RF dia', 'PCD']);
  const left = firstFact(ordered, ['OD', 'ID']);
  const mid = firstFact(ordered, ['Wall / Thk', 'RF height']);
  if (f2f) calls.push({ slot: 'f2f', label: f2f.label, value: formatFact(f2f), arrow: true });
  if (height) calls.push({ slot: 'height', label: height.label, value: formatFact(height), arrow: true });
  if (top && top !== f2f) calls.push({ slot: 'top', label: top.label, value: formatFact(top), arrow: true });
  if (left && left !== top && left !== f2f) calls.push({ slot: 'left', label: left.label, value: formatFact(left), arrow: true });
  if (mid && mid !== top && mid !== left && mid !== f2f) calls.push({ slot: 'mid', label: mid.label, value: formatFact(mid), arrow: true });
  weights.slice(0, 2).forEach((fact, index) => calls.push({ slot: index ? 'badge2' : 'badge1', label: fact.label, value: formatFact(fact), arrow: false }));
  ordered.filter((fact) => !calls.some((item) => item.label === fact.label)).slice(0, 2).forEach((fact, index) => calls.push({ slot: index ? 'badge3' : 'badge2', label: fact.label, value: formatFact(fact), arrow: false }));
  return calls.filter((item) => item.value && !String(item.value).includes('—')).slice(0, 7);
}

function firstFact(facts, labels) {
  return labels.map((label) => facts.find((fact) => fact.label === label)).find(Boolean);
}

function calloutNode(callout) {
  const slot = SLOTS[callout.slot] || SLOTS.badge1;
  const group = svgNode('g', { class: `dimension-callout dimension-callout-${callout.slot}` });
  if (callout.arrow && Number.isFinite(slot.x1)) group.append(svgNode('line', {
    class: 'dimension-callout-line',
    x1: slot.x1,
    y1: slot.y1,
    x2: slot.x2,
    y2: slot.y2,
  }));
  group.append(labelNode(`${callout.label}: ${callout.value}`, slot));
  return group;
}

function labelNode(text, slot) {
  const label = String(text || '').trim();
  const width = Math.min(320, Math.max(92, label.length * 7.2 + 18));
  const height = 28;
  const x = slot.anchor === 'middle' ? slot.lx - width / 2 : slot.lx;
  const y = slot.ly - height + 8;
  const group = svgNode('g', { class: 'dimension-callout-label-group' });
  group.append(svgNode('rect', { class: 'dimension-callout-box', x, y, width, height, rx: 8, ry: 8 }));
  const textNode = svgNode('text', { class: 'dimension-callout-label', x: x + 9, y: y + 19 });
  textNode.textContent = label;
  group.append(textNode);
  return group;
}

function defs() {
  const defsNode = svgNode('defs');
  const marker = svgNode('marker', {
    id: 'dimension-callout-arrow',
    markerWidth: 10,
    markerHeight: 10,
    refX: 5,
    refY: 5,
    orient: 'auto-start-reverse',
    markerUnits: 'strokeWidth',
  });
  marker.append(svgNode('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'dimension-callout-arrow' }));
  defsNode.append(marker);
  return defsNode;
}

function svgNode(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}
