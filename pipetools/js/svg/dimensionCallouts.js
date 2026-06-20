import { dimensionFacts, formatFact, weightFacts } from '../dimensionDisplay.js';
import { getDimensionCalloutMode } from './dimensionCalloutModeStore.js';
import { calloutTemplateFor } from './dimensionCalloutTemplates.js';

const NS = 'http://www.w3.org/2000/svg';
const ARROW_ID = 'dimension-callout-arrow';
const DOT_ID = 'dimension-callout-dot';
const LAYER_SIZE = 1000;
const LABEL_HEIGHT = 28;
const LABEL_GAP = 7;
const LABEL_MARGIN = 16;
const WITNESS = 34;
const FULL_LIMIT = 8;
const COMPACT_LIMIT = 4;
const LABEL_OFFSETS = [
  [0, 0], [0, -44], [0, 44], [46, 0], [-46, 0],
  [56, -38], [-56, -38], [56, 38], [-56, 38], [0, -88], [0, 88],
];

export function renderDimensionCallouts(row, symbol, viewport) {
  if (!viewport) return [];
  viewport.__pipeToolsDimensionRow = row;
  viewport.__pipeToolsDimensionSymbol = symbol;
  clearDimensionCallouts(viewport);
  const mode = getDimensionCalloutMode();
  viewport.dataset.dimensionCalloutMode = mode;
  if (mode === 'off') return [];
  const callouts = layoutCallouts(calloutsForMode(buildCallouts(row, symbol), mode));
  if (!callouts.length) return [];
  const layer = svgNode('svg', {
    class: `dimension-callout-layer dimension-callout-mode-${mode} dimension-callout-family-${String(symbol?.family || 'unknown').toLowerCase()}`,
    viewBox: `0 0 ${LAYER_SIZE} ${LAYER_SIZE}`,
    preserveAspectRatio: 'none',
    'aria-label': `Source-backed DB dimension callouts (${mode})`,
  });
  layer.append(defs());
  callouts.forEach((callout) => layer.append(calloutNode(callout)));
  viewport.append(layer);
  return callouts;
}

export function refreshDimensionCallouts(scope = document) {
  let total = 0;
  scope?.querySelectorAll?.('[data-source-svg-viewport]').forEach((viewport) => {
    total += renderDimensionCallouts(viewport.__pipeToolsDimensionRow, viewport.__pipeToolsDimensionSymbol, viewport).length;
  });
  return total;
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
    calls.push({ slot: template.slots[slotName], slotName, label: fact.label, value, arrow, priority: priorityFor(fact.label, slotName) });
  }
  fallbackFacts(facts, used, template.slots).forEach((callout) => calls.push(callout));
  return calls.slice(0, FULL_LIMIT);
}

function calloutsForMode(callouts, mode) {
  if (mode === 'compact') {
    const primary = callouts.filter((callout) => callout.priority <= 2).slice(0, COMPACT_LIMIT);
    return primary.length ? primary : callouts.slice(0, Math.min(2, callouts.length));
  }
  return callouts.slice(0, FULL_LIMIT);
}

function priorityFor(label, slotName = '') {
  const text = `${label} ${slotName}`.toLowerCase();
  if (/f2f|face|height|h\/w|hw|c-e|center|centre/.test(text)) return 1;
  if (/od|o\.d|id|i\.d|wall|thk|thick|rf dia|pcd|bolt/.test(text)) return 2;
  if (/weight/.test(text)) return 4;
  return 3;
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
    .map((fact, index) => ({ slot: badgeSlots[index] || slots.badge1, slotName: `badge${index + 1}`, label: fact.label, value: formatFact(fact), arrow: false, priority: priorityFor(fact.label, `badge${index + 1}`) }));
}

function isRenderable(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && !/^[—–-]+$/.test(text);
}

function layoutCallouts(callouts) {
  const placed = [];
  return callouts.map((callout) => {
    const label = calloutLabel(callout);
    const base = callout.slot || {};
    const candidate = firstNonOverlappingSlot(label, base, placed);
    placed.push(candidate.box);
    return { ...callout, labelText: label, layoutSlot: candidate.slot, labelBox: candidate.box, adjusted: candidate.adjusted };
  });
}

function calloutLabel(callout) {
  const prefix = shouldPrefixDiameter(callout) ? 'Ø ' : '';
  return `${prefix}${callout.label}: ${callout.value}`;
}

function shouldPrefixDiameter(callout) {
  const text = `${callout.slotName} ${callout.label}`.toLowerCase();
  return /diameter|od|id|rf dia|pcd|hw dia/.test(text) && !/count|size|weight/.test(text);
}

function firstNonOverlappingSlot(label, baseSlot, placed) {
  let best = null;
  for (const [dx, dy] of LABEL_OFFSETS) {
    const rawSlot = { ...baseSlot, lx: Number(baseSlot.lx ?? 500) + dx, ly: Number(baseSlot.ly ?? 500) + dy };
    const candidate = clampSlotWithLabel(rawSlot, label);
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

function clampSlotWithLabel(slot, label) {
  const box = labelBox(label, slot);
  const next = { ...slot };
  let dx = 0, dy = 0;
  if (box.x < LABEL_MARGIN) dx = LABEL_MARGIN - box.x;
  if (box.x + box.width > LAYER_SIZE - LABEL_MARGIN) dx = LAYER_SIZE - LABEL_MARGIN - box.width - box.x;
  if (box.y < LABEL_MARGIN) dy = LABEL_MARGIN - box.y;
  if (box.y + box.height > LAYER_SIZE - LABEL_MARGIN) dy = LAYER_SIZE - LABEL_MARGIN - box.height - box.y;
  next.lx = Number(next.lx ?? 500) + dx;
  next.ly = Number(next.ly ?? 500) + dy;
  return { slot: next, box: labelBox(label, next), clamped: dx !== 0 || dy !== 0 };
}

function overlaps(a, b) {
  return a.x < b.x + b.width + LABEL_GAP && a.x + a.width + LABEL_GAP > b.x && a.y < b.y + b.height + LABEL_GAP && a.y + a.height + LABEL_GAP > b.y;
}

function calloutNode(callout) {
  const slot = callout.layoutSlot || callout.slot;
  if (!slot) return svgNode('g');
  const kind = geometryKind(callout, slot);
  const group = svgNode('g', { class: `dimension-callout dimension-callout-${callout.slotName} dimension-callout-kind-${kind}${callout.adjusted ? ' dimension-callout-adjusted' : ''}` });
  geometryNodes(kind, slot).forEach((node) => group.append(node));
  group.append(labelNode(callout.labelText || `${callout.label}: ${callout.value}`, slot));
  return group;
}

function geometryKind(callout, slot) {
  if (!callout.arrow || slot.kind === 'badge') return 'badge';
  if (slot.kind) return slot.kind;
  if (/height|branch|small|large/.test(String(callout.slotName))) return 'dimension-y';
  if (/diameter|od|id/.test(`${callout.slotName} ${callout.label}`.toLowerCase())) return 'diameter';
  if (/thick|wall|rf height/.test(`${callout.slotName} ${callout.label}`.toLowerCase())) return 'leader';
  return 'dimension-x';
}

function geometryNodes(kind, slot) {
  if (!Number.isFinite(Number(slot.x1)) || kind === 'badge') return [];
  if (kind === 'leader') return leaderNodes(slot);
  if (kind === 'dimension-y') return dimensionYNodes(slot);
  if (kind === 'diameter') return diameterNodes(slot);
  return dimensionXNodes(slot);
}

function dimensionXNodes(slot) {
  const x1 = Number(slot.x1), y1 = Number(slot.y1), x2 = Number(slot.x2), y2 = Number(slot.y2);
  const side = y1 > 500 ? -1 : 1;
  return [
    lineNode('dimension-callout-witness', x1, y1 + WITNESS * side, x1, y1 - 10 * side),
    lineNode('dimension-callout-witness', x2, y2 + WITNESS * side, x2, y2 - 10 * side),
    lineNode('dimension-callout-line dimension-callout-dimension-line', x1, y1, x2, y2, { 'marker-start': `url(#${ARROW_ID})`, 'marker-end': `url(#${ARROW_ID})` }),
  ];
}

function dimensionYNodes(slot) {
  const x1 = Number(slot.x1), y1 = Number(slot.y1), x2 = Number(slot.x2), y2 = Number(slot.y2);
  const side = x1 > 500 ? -1 : 1;
  return [
    lineNode('dimension-callout-witness', x1 + WITNESS * side, y1, x1 - 10 * side, y1),
    lineNode('dimension-callout-witness', x2 + WITNESS * side, y2, x2 - 10 * side, y2),
    lineNode('dimension-callout-line dimension-callout-dimension-line', x1, y1, x2, y2, { 'marker-start': `url(#${ARROW_ID})`, 'marker-end': `url(#${ARROW_ID})` }),
  ];
}

function diameterNodes(slot) {
  const x1 = Number(slot.x1), y1 = Number(slot.y1), x2 = Number(slot.x2), y2 = Number(slot.y2);
  return [
    lineNode('dimension-callout-centre-mark', (x1 + x2) / 2 - 12, (y1 + y2) / 2, (x1 + x2) / 2 + 12, (y1 + y2) / 2),
    lineNode('dimension-callout-line dimension-callout-diameter-line', x1, y1, x2, y2, { 'marker-start': `url(#${ARROW_ID})`, 'marker-end': `url(#${ARROW_ID})` }),
  ];
}

function leaderNodes(slot) {
  const x1 = Number(slot.x1), y1 = Number(slot.y1), x2 = Number(slot.x2), y2 = Number(slot.y2);
  return [
    lineNode('dimension-callout-line dimension-callout-leader-line', x1, y1, x2, y2, { 'marker-end': `url(#${ARROW_ID})` }),
    svgNode('circle', { class: 'dimension-callout-leader-dot', cx: x1, cy: y1, r: 4 }),
  ];
}

function lineNode(className, x1, y1, x2, y2, attrs = {}) {
  return svgNode('line', { class: className, x1, y1, x2, y2, ...attrs });
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
  const dot = svgNode('marker', { id: DOT_ID, markerWidth: 8, markerHeight: 8, refX: 4, refY: 4, orient: 'auto' });
  dot.append(svgNode('circle', { cx: 4, cy: 4, r: 3, class: 'dimension-callout-arrow' }));
  defsNode.append(dot);
  return defsNode;
}

function svgNode(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}
