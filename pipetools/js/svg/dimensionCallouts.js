import { dimensionFacts, formatFact, weightFacts } from '../dimensionDisplay.js';
import { calloutTemplateFor } from './dimensionCalloutTemplates.js';

const NS = 'http://www.w3.org/2000/svg';
const ARROW_ID = 'dimension-callout-arrow';
const LAYER_SIZE = 1000;
const LABEL_HEIGHT = 28;
const LABEL_GAP = 7;
const LABEL_MARGIN = 16;
const LABEL_OFFSETS = [
  [0, 0], [0, -44], [0, 44], [46, 0], [-46, 0],
  [56, -38], [-56, -38], [56, 38], [-56, 38], [0, -88], [0, 88],
];

export function renderDimensionCallouts(row, symbol, viewport) {
  if (!viewport) return [];
  clearDimensionCallouts(viewport);
  const callouts = layoutCallouts(buildCallouts(row, symbol));
  if (!callouts.length) return [];
  const layer = svgNode('svg', {
    class: `dimension-callout-layer dimension-callout-family-${String(symbol?.family || 'unknown').toLowerCase()}`,
    viewBox: `0 0 ${LAYER_SIZE} ${LAYER_SIZE}`,
    preserveAspectRatio: 'none',
    'aria-label': 'Source-backed DB dimension callouts',
  });
  layer.append(defs());
  callouts.forEach((callout) => layer.append(calloutNode(callout)));
  viewport.append(layer);
  return callouts;
}

export function clearDimensionCallouts(scope = document.querySelector('.source-svg-canvas')) {
  scope?.querySelectorAll?.('.dimension-callout-layer').forEach((node) => node.remove());
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
  return Boolean(text) && !/^[—–-]+$/.test(text);
}

function layoutCallouts(callouts) {
  const placed = [];
  return callouts.map((callout) => {
    const label = `${callout.label}: ${callout.value}`;
    const base = callout.slot || {};
    const candidate = firstNonOverlappingSlot(label, base, placed);
    placed.push(candidate.box);
    return { ...callout, labelText: label, layoutSlot: candidate.slot, labelBox: candidate.box, adjusted: candidate.adjusted };
  });
}

function firstNonOverlappingSlot(label, baseSlot, placed) {
  let best = null;
  for (const [dx, dy] of LABEL_OFFSETS) {
    const rawSlot = { ...baseSlot, lx: Number(baseSlot.lx ?? 500) + dx, ly: Number(baseSlot.ly ?? 500) + dy };
    const candidate = clampSlotWithBox(rawSlot, labelBox(label, rawSlot));
    if (!best) best = candidate;
    if (!placed.some((box) => overlaps(candidate.box, box))) return { ...candidate, adjusted: dx !== 0 || dy !== 0 || candidate.clamped };
  }
  return { ...best, adjusted: true };
}

function labelBox(label, slot) {
  const width = Math.min(340, Math.max(92, String(label).length * 7.2 + 18));
  const height = LABEL_HEIGHT;
  const x = slot.anchor === 'middle' ? Number(slot.lx ?? 500) - width / 2 : Number(slot.lx ?? 500);
  const y = Number(slot.ly ?? 500) - height + 8;
  return { x, y, width, height };
}

function clampSlotWithBox(slot, box) {
  const next = { ...slot };
  let dx = 0, dy = 0;
  if (box.x < LABEL_MARGIN) dx = LABEL_MARGIN - box.x;
  if (box.x + box.width > LAYER_SIZE - LABEL_MARGIN) dx = LAYER_SIZE - LABEL_MARGIN - box.width - box.x;
  if (box.y < LABEL_MARGIN) dy = LABEL_MARGIN - box.y;
  if (box.y + box.height > LAYER_SIZE - LABEL_MARGIN) dy = LAYER_SIZE - LABEL_MARGIN - box.height - box.y;
  next.lx = Number(next.lx ?? 500) + dx;
  next.ly = Number(next.ly ?? 500) + dy;
  return { slot: next, box: labelBox(`${box.width}`, next), clamped: dx !== 0 || dy !== 0 };
}

function overlaps(a, b) {
  return a.x < b.x + b.width + LABEL_GAP && a.x + a.width + LABEL_GAP > b.x && a.y < b.y + b.height + LABEL_GAP && a.y + a.height + LABEL_GAP > b.y;
}

function calloutNode(callout) {
  const slot = callout.layoutSlot || callout.slot;
  if (!slot) return svgNode('g');
  const group = svgNode('g', { class: `dimension-callout dimension-callout-${callout.slotName}${callout.adjusted ? ' dimension-callout-adjusted' : ''}` });
  if (callout.arrow && Number.isFinite(slot.x1)) group.append(svgNode('line', {
    class: 'dimension-callout-line',
    x1: slot.x1,
    y1: slot.y1,
    x2: slot.x2,
    y2: slot.y2,
    'marker-start': `url(#${ARROW_ID})`,
    'marker-end': `url(#${ARROW_ID})`,
  }));
  group.append(labelNode(callout.labelText || `${callout.label}: ${callout.value}`, slot));
  return group;
}

function labelNode(text, slot) {
  const label = String(text || '').trim();
  const box = labelBox(label, slot);
  const group = svgNode('g', { class: 'dimension-callout-label-group' });
  group.append(svgNode('rect', { class: 'dimension-callout-box', x: box.x, y: box.y, width: box.width, height: box.height, rx: 8, ry: 8 }));
  const textNode = svgNode('text', { class: 'dimension-callout-label', x: box.x + 9, y: box.y + 19 });
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
