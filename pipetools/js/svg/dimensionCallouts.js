import { dimensionFacts, formatFact, weightFacts } from '../dimensionDisplay.js';
import { calloutTemplateFor } from './dimensionCalloutTemplates.js';

const NS = 'http://www.w3.org/2000/svg';
const ARROW_ID = 'dimension-callout-arrow';

export function renderDimensionCallouts(row, symbol, canvas) {
  if (!canvas) return [];
  clearDimensionCallouts(canvas);
  const callouts = buildCallouts(row, symbol);
  if (!callouts.length) return [];
  const layer = svgNode('svg', {
    class: `dimension-callout-layer dimension-callout-family-${String(symbol?.family || 'unknown').toLowerCase()}`,
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
  const template = calloutTemplateFor(symbol);
  const facts = factMap([...dimensionFacts(row), ...weightFacts(row)]);
  const used = new Set();
  const calls = [];
  for (const [slotName, labels, arrow = true] of template.fields || []) {
    const fact = firstUnusedFact(facts, labels, used);
    if (!fact) continue;
    const value = formatFact(fact);
    if (!isRenderable(value)) continue;
    used.add(fact.label);
    calls.push({ slot: template.slots[slotName], slotName, label: fact.label, value, arrow });
  }
  fallbackFacts(facts, used, template.slots).forEach((callout) => calls.push(callout));
  return calls.slice(0, 8);
}

function factMap(facts) {
  const map = new Map();
  facts.filter(Boolean).forEach((fact) => {
    const value = formatFact(fact);
    if (isRenderable(value) && !map.has(fact.label)) map.set(fact.label, fact);
  });
  return map;
}

function firstUnusedFact(facts, labels = [], used) {
  return labels.map((label) => facts.get(label)).find((fact) => fact && !used.has(fact.label));
}

function fallbackFacts(facts, used, slots) {
  const badgeSlots = [slots.badge1, slots.badge2, slots.badge3, slots.badge4].filter(Boolean);
  return [...facts.values()]
    .filter((fact) => !used.has(fact.label))
    .slice(0, Math.max(0, 3 - used.size))
    .map((fact, index) => ({ slot: badgeSlots[index] || slots.badge1, slotName: `badge${index + 1}`, label: fact.label, value: formatFact(fact), arrow: false }));
}

function isRenderable(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && !/[—–]/.test(text) && text !== '-';
}

function calloutNode(callout) {
  const slot = callout.slot;
  if (!slot) return svgNode('g');
  const group = svgNode('g', { class: `dimension-callout dimension-callout-${callout.slotName}` });
  if (callout.arrow && Number.isFinite(slot.x1)) group.append(svgNode('line', {
    class: 'dimension-callout-line',
    x1: slot.x1,
    y1: slot.y1,
    x2: slot.x2,
    y2: slot.y2,
    'marker-start': `url(#${ARROW_ID})`,
    'marker-end': `url(#${ARROW_ID})`,
  }));
  group.append(labelNode(`${callout.label}: ${callout.value}`, slot));
  return group;
}

function labelNode(text, slot) {
  const label = String(text || '').trim();
  const width = Math.min(340, Math.max(92, label.length * 7.2 + 18));
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
    id: ARROW_ID,
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
