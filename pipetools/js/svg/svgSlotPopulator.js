import { dimensionFacts, formatFact, weightFacts } from '../dimensionDisplay.js';

const DEFAULT_PLACEHOLDERS = ['-', '–', '—'];

export function populateSvgSlots(svgRoot, sourceCode, slotBinding, row = {}, options = {}) {
  const empty = {
    sourceCode: sourceCode || '',
    populatedLabels: [],
    missingLabels: [],
    suppressedOverlayLabels: [],
    populatedCount: 0,
    slots: [],
  };
  if (!svgRoot || !slotBinding?.slots || slotBinding.sourceCode !== sourceCode) return empty;

  const textNodes = collectTextNodes(svgRoot);
  if (!textNodes.length) return { ...empty, missingLabels: Object.keys(slotBinding.slots) };

  const facts = factList(row);
  const populatedLabels = [];
  const missingLabels = [];
  const suppressed = new Set();
  const slots = [];

  for (const [slotLabel, slot] of Object.entries(slotBinding.slots)) {
    const fact = factForSlot(facts, slotLabel, slot);
    const value = fact ? formatFact(fact) : '';
    if (!fact || !isRenderable(value)) {
      missingLabels.push(slotLabel);
      continue;
    }

    const labelNode = findLabelNode(textNodes, slot.labelText);
    if (!labelNode) {
      missingLabels.push(slotLabel);
      continue;
    }

    const target = findTargetTextNode(textNodes, labelNode, slot, options);
    if (!target) {
      missingLabels.push(slotLabel);
      continue;
    }

    const previousText = textContent(target);
    const mode = target === labelNode ? 'label-text' : 'placeholder-text';
    setTextContent(target, mode === 'label-text' ? `${previousText}: ${value}` : value);
    markPopulatedNode(target, slotLabel, fact.path, mode);

    populatedLabels.push(slotLabel);
    [slotLabel, fact.label, ...slot.suppressOverlayLabels].forEach((label) => {
      if (isRenderable(label)) suppressed.add(label);
    });
    slots.push({ label: slotLabel, factLabel: fact.label, factPath: fact.path, mode, previousText, value });
  }

  return {
    sourceCode,
    populatedLabels,
    missingLabels,
    suppressedOverlayLabels: [...suppressed],
    populatedCount: populatedLabels.length,
    slots,
  };
}

export function suppressLabelsForPopulatedSlots(slotPopulation) {
  return Array.isArray(slotPopulation?.suppressedOverlayLabels) ? slotPopulation.suppressedOverlayLabels : [];
}

function factList(row) {
  return [...dimensionFacts(row), ...weightFacts(row)].filter((fact) => isRenderable(fact?.label) && isRenderable(formatFact(fact)));
}

function factForSlot(facts, slotLabel, slot) {
  const wanted = [slotLabel, ...slot.preferredValueKeys, ...slot.suppressOverlayLabels].map(normalizedKey).filter(Boolean);
  return facts.find((fact) => {
    const candidates = [fact.label, fact.path].map(normalizedKey).filter(Boolean);
    return candidates.some((candidate) => wanted.includes(candidate));
  }) || null;
}

function collectTextNodes(svgRoot) {
  const nodes = [];
  svgRoot.querySelectorAll?.('text, tspan').forEach((node) => {
    if (node.querySelector?.('text, tspan')) return;
    const text = textContent(node);
    if (!text || /^(?:null|undefined)$/i.test(text)) return;
    nodes.push({ node, text, point: textPoint(node) });
  });
  return nodes;
}

function findLabelNode(textNodes, labelText) {
  const wanted = new Set((labelText || []).map(normalizedText).filter(Boolean));
  return textNodes.find((entry) => wanted.has(normalizedText(entry.text))) || null;
}

function findTargetTextNode(textNodes, labelEntry, slot, options) {
  const labelNode = labelEntry.node;
  const placeholders = [...DEFAULT_PLACEHOLDERS, ...(slot.placeholderNear || [])];
  const wanted = new Set(placeholders.map(normalizedText));
  const candidates = textNodes.filter((entry) => entry.node !== labelNode && wanted.has(normalizedText(entry.text)));
  if (candidates.length) return nearestEntry(labelEntry, candidates).node;
  return options.allowLabelFallback === false ? null : labelNode;
}

function nearestEntry(origin, candidates) {
  if (!origin?.point) return candidates[0];
  return candidates
    .map((candidate) => ({ candidate, distance: distanceSquared(origin.point, candidate.point) }))
    .sort((a, b) => a.distance - b.distance)[0].candidate;
}

function textPoint(node) {
  let current = node;
  while (current) {
    const x = numberAttr(current, 'x');
    const y = numberAttr(current, 'y');
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    current = current.parentElement || current.parentNode || null;
  }
  return null;
}

function numberAttr(node, name) {
  if (!node?.getAttribute) return NaN;
  const raw = String(node.getAttribute(name) ?? '').split(/[\s,]+/)[0];
  const value = Number(raw);
  return Number.isFinite(value) ? value : NaN;
}

function distanceSquared(a, b) {
  if (!a || !b) return Number.MAX_SAFE_INTEGER;
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function markPopulatedNode(entry, slotLabel, factPath, mode) {
  const node = entry?.nodeType ? entry : entry?.node;
  node?.setAttribute?.('data-pipetools-slot', slotLabel);
  node?.setAttribute?.('data-pipetools-source-backed', 'true');
  node?.setAttribute?.('data-pipetools-slot-mode', mode);
  if (factPath) node?.setAttribute?.('data-pipetools-fact-path', factPath);
}

function textContent(entry) {
  return String((entry?.node || entry)?.textContent ?? '').trim();
}

function setTextContent(entry, value) {
  const node = entry?.node || entry;
  if (node) node.textContent = value;
}

function normalizedText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizedKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[._\s/\\-]+/g, '');
}

function isRenderable(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && !/^(?:—|–|-|null|undefined)$/i.test(text);
}
