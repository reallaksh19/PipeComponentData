import { dimensionFacts, formatFact, weightFacts } from '../dimensionDisplay.js';
import {
  boxCenter,
  buildSvgTextInventory,
  distance,
  multiplyMatrices,
  normalizeSvgText,
  parseSvgTransform,
  pointInsideBox,
  transformBox,
} from './svgTextInventory.js';

const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;
const DEFAULT_PLACEHOLDERS = ['-', '–', '—'];
const TARGET_TOLERANCE = 50;
const GEOMETRY_SELECTOR = 'path,line,polyline,polygon,rect,circle,ellipse';
const TEXT_TAGS = new Set(['text', 'tspan']);
const DEFAULT_NATIVE_TEXT_STYLE = Object.freeze({
  fontSize: '112',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontWeight: '600',
  fill: '#111827',
  stroke: '#ffffff',
  strokeWidth: '3',
});

export function populateSvgSlots(svgRoot, sourceCode, slotBinding, row = {}, options = {}) {
  const empty = emptyResult(sourceCode);
  if (!svgRoot || !slotBinding?.slots || slotBinding.sourceCode !== sourceCode) return empty;

  const inventory = options.inventory || buildSvgTextInventory(svgRoot, options);
  const slotEntries = Object.entries(slotBinding.slots);
  if (!inventory.length) {
    return {
      ...empty,
      missingLabels: slotEntries.map(([label]) => label),
      slots: slotEntries.map(([label]) => notPopulated(sourceCode, label, 0, 'no SVG text inventory entries')),
    };
  }

  const facts = factList(row);
  const threshold = confidenceThreshold(slotBinding, options);
  const populatedLabels = [];
  const missingLabels = [];
  const suppressed = new Set();
  const usedNodes = new Set();
  const hiddenGeometryNodes = new Set();
  const slots = [];
  const cleanedPlaceholderPaths = [];
  const hiddenGeometryPaths = [];

  for (const [slotLabel, slot] of slotEntries) {
    const fact = factForSlot(facts, slotLabel, slot);
    const value = fact ? formatFact(fact) : '';

    if (!fact || !isRenderable(value)) {
      missingLabels.push(slotLabel);
      const cleaned = cleanupSlotPlaceholders(inventory, slotLabel, slot, usedNodes);
      const hidden = hideMissingSlotGeometry(svgRoot, slotLabel, slot, options, hiddenGeometryNodes);
      cleanedPlaceholderPaths.push(...cleaned.map((entry) => entry.path));
      hiddenGeometryPaths.push(...hidden.map((entry) => entry.path));
      slots.push(notPopulated(sourceCode, slotLabel, 0, 'no source-backed DB fact', {}, cleaned, hidden));
      continue;
    }

    const match = matchTargetForSlot(inventory, slotLabel, slot, { threshold, usedNodes });
    if (!match || match.confidence < threshold || !match.target?.node || usedNodes.has(match.target.node)) {
      missingLabels.push(slotLabel);
      const confidence = match?.confidence ?? 0;
      const reason = match?.reason || `confidence ${confidence.toFixed(2)} below threshold ${threshold}`;
      const cleaned = cleanupSlotPlaceholders(inventory, slotLabel, slot, usedNodes);
      cleanedPlaceholderPaths.push(...cleaned.map((entry) => entry.path));
      slots.push(notPopulated(sourceCode, slotLabel, confidence, reason, match, cleaned));
      continue;
    }

    const target = match.target;
    const before = target.text;
    setTextContent(target.node, value);
    markPopulatedNode(target.node, slotLabel, fact.path, match.confidence, slot, slotBinding);
    usedNodes.add(target.node);

    const cleaned = cleanupSlotPlaceholders(inventory, slotLabel, slot, usedNodes);
    cleanedPlaceholderPaths.push(...cleaned.map((entry) => entry.path));

    const detail = {
      sourceCode,
      slot: slotLabel,
      status: 'populated',
      confidence: roundConfidence(match.confidence),
      targetPath: target.path,
      targetTextBefore: before,
      targetTextAfter: value,
      matchedBy: match.matchedBy,
      reason: match.reason,
      factLabel: fact.label,
      factPath: fact.path,
      displayValue: value,
      suppressedOverlayLabels: effectiveSuppressLabels(slotLabel, slot, fact),
      cleanedPlaceholderPaths: cleaned.map((entry) => entry.path),
      cleanedPlaceholderCount: cleaned.length,
      hiddenGeometryPaths: [],
      hiddenGeometryCount: 0,
    };
    slots.push(detail);
    populatedLabels.push(slotLabel);
    detail.suppressedOverlayLabels.forEach((label) => suppressed.add(label));
  }

  const result = {
    sourceCode,
    populatedLabels,
    missingLabels,
    suppressedOverlayLabels: [...suppressed],
    populatedCount: populatedLabels.length,
    failedCount: slots.filter((slot) => slot.status !== 'populated').length,
    confidenceThreshold: threshold,
    cleanedPlaceholderCount: cleanedPlaceholderPaths.length,
    cleanedPlaceholderPaths,
    hiddenGeometryCount: hiddenGeometryPaths.length,
    hiddenGeometryPaths,
    slots,
  };

  emitSlotDiagnostics(result, options);
  return result;
}

export function suppressLabelsForPopulatedSlots(slotPopulation, minConfidence = DEFAULT_CONFIDENCE_THRESHOLD) {
  const labels = new Set();
  for (const slot of slotPopulation?.slots || []) {
    if (slot?.status === 'populated' && Number(slot.confidence) >= minConfidence) {
      for (const label of slot.suppressedOverlayLabels || []) {
        if (isRenderable(label)) labels.add(label);
      }
    }
  }
  return [...labels];
}

export function slotDiagnosticsSummary(slotPopulation) {
  const slots = Array.isArray(slotPopulation?.slots) ? slotPopulation.slots : [];
  return {
    sourceCode: slotPopulation?.sourceCode || '',
    slotCount: slots.length,
    populatedCount: slots.filter((slot) => slot.status === 'populated').length,
    failedCount: slots.filter((slot) => slot.status !== 'populated').length,
    confidenceThreshold: Number(slotPopulation?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD),
    cleanedPlaceholderCount: Number(slotPopulation?.cleanedPlaceholderCount || 0),
    cleanedPlaceholderPaths: slotPopulation?.cleanedPlaceholderPaths || [],
    hiddenGeometryCount: Number(slotPopulation?.hiddenGeometryCount || 0),
    hiddenGeometryPaths: slotPopulation?.hiddenGeometryPaths || [],
    slots: slots.map((slot) => ({
      slot: slot.slot,
      status: slot.status,
      confidence: slot.confidence,
      reason: slot.reason,
      targetPath: slot.targetPath || '',
      targetTextBefore: slot.targetTextBefore || '',
      targetTextAfter: slot.targetTextAfter || '',
      factLabel: slot.factLabel || '',
      factPath: slot.factPath || '',
      displayValue: slot.displayValue || slot.targetTextAfter || '',
      suppressedOverlayLabels: slot.suppressedOverlayLabels || [],
      cleanedPlaceholderCount: Number(slot.cleanedPlaceholderCount || 0),
      cleanedPlaceholderPaths: slot.cleanedPlaceholderPaths || [],
      hiddenGeometryCount: Number(slot.hiddenGeometryCount || 0),
      hiddenGeometryPaths: slot.hiddenGeometryPaths || [],
    })),
  };
}

export function matchTargetForSlot(inventory, slotLabel, slot, options = {}) {
  const target = slot?.target || {};
  const threshold = Number(options.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD);
  const targetBox = normalizedBox(target.targetBox);
  if (!targetBox) return { confidence: 0, reason: 'slot has no valid targetBox', matchedBy: [] };

  const labelCandidates = findLabelCandidates(inventory, slot, target);
  const targetCandidates = findTargetCandidates(inventory, slotLabel, slot, target, options.usedNodes || new Set());
  if (!targetCandidates.length) {
    return {
      confidence: 0,
      reason: 'no placeholder or allowed text inside targetBox',
      matchedBy: ['targetRegion'],
      labelCandidateCount: labelCandidates.length,
    };
  }

  const scored = targetCandidates
    .map((candidate) => scoreTargetCandidate(candidate, targetCandidates, labelCandidates, target))
    .sort((a, b) => b.confidence - a.confidence || a.distanceToLabel - b.distanceToLabel || a.target.path.localeCompare(b.target.path));

  const best = scored[0];
  const runnerUp = scored[1];
  if (runnerUp && best.confidence - runnerUp.confidence < 0.04) {
    best.confidence = Math.max(0, best.confidence - 0.12);
    best.matchedBy.push('ambiguityPenalty');
    best.reason = 'ambiguous target candidates inside targetBox';
  }

  if (best.confidence < threshold) {
    best.reason = best.reason || `confidence ${best.confidence.toFixed(2)} below threshold ${threshold}`;
  } else {
    best.reason = best.reason || 'placeholder inside targetBox and nearest expected label';
  }
  return best;
}

function findLabelCandidates(inventory, slot, target) {
  const labelTexts = stringList(slot.labelText).map(normalizeSvgText).filter(Boolean);
  if (!labelTexts.length) return [];
  const labelBox = normalizedBox(target.labelBox);
  return inventory
    .map((entry) => {
      const match = labelMatchScore(entry.normalizedText, labelTexts);
      if (match <= 0) return null;
      const inBox = labelBox ? pointInsideBox(entry.center, labelBox, TARGET_TOLERANCE) : true;
      if (!inBox) return null;
      return { entry, score: match + (labelBox && pointInsideBox(entry.center, labelBox, 0) ? 0.2 : 0), inLabelBox: Boolean(labelBox) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.entry.path.localeCompare(b.entry.path));
}

function findTargetCandidates(inventory, slotLabel, slot, target, usedNodes) {
  const targetBox = normalizedBox(target.targetBox);
  const allowed = allowedTargetTexts(slotLabel, slot, target);
  return inventory
    .filter((entry) => !usedNodes.has(entry.node))
    .map((entry) => {
      const inside = pointInsideBox(entry.center, targetBox, 0);
      const near = !inside && pointInsideBox(entry.center, targetBox, TARGET_TOLERANCE);
      if (!inside && !near) return null;
      const textScore = allowedTextScore(entry.normalizedText, allowed);
      if (textScore <= 0) return null;
      return { entry, inside, near, textScore };
    })
    .filter(Boolean);
}

function scoreTargetCandidate(candidate, candidates, labelCandidates, target) {
  const matchedBy = [];
  let confidence = 0;
  if (candidate.inside) {
    confidence += 0.45;
    matchedBy.push('targetRegion');
  } else if (candidate.near) {
    confidence += 0.18;
    matchedBy.push('targetRegionTolerance');
  }

  confidence += Math.min(0.2, candidate.textScore);
  if (candidate.textScore > 0) matchedBy.push('placeholderText');

  let nearestLabel = null;
  let distanceToLabel = Number.POSITIVE_INFINITY;
  if (labelCandidates.length) {
    const ranked = labelCandidates
      .map((label) => ({ label, d: distance(candidate.entry.center, label.entry.center) }))
      .sort((a, b) => a.d - b.d);
    nearestLabel = ranked[0]?.label || null;
    distanceToLabel = ranked[0]?.d ?? Number.POSITIVE_INFINITY;
    confidence += 0.15;
    matchedBy.push(nearestLabel?.inLabelBox ? 'labelRegion' : 'labelText');
  }

  const maxDistance = positiveNumber(target.maxDistanceFromLabel);
  if (nearestLabel && (!maxDistance || distanceToLabel <= maxDistance)) {
    confidence += 0.10;
    matchedBy.push('maxDistanceFromLabel');
  } else if (maxDistance && nearestLabel && distanceToLabel > maxDistance) {
    confidence -= 0.12;
    matchedBy.push('distancePenalty');
  }

  if (hasNearbyUnit(candidate.entry, target.unitTextNearby, candidates.map((item) => item.entry))) {
    confidence += 0.05;
    matchedBy.push('unitTextNearby');
  }

  if (candidates.length === 1) {
    confidence += 0.05;
    matchedBy.push('uniqueTarget');
  } else if (candidates.length > 2) {
    confidence -= Math.min(0.18, (candidates.length - 1) * 0.04);
    matchedBy.push('repeatedTargetPenalty');
  }

  confidence = Math.max(0, Math.min(0.99, confidence));
  return {
    target: candidate.entry,
    confidence,
    matchedBy,
    distanceToLabel,
    reason: '',
  };
}

function cleanupSlotPlaceholders(inventory, slotLabel, slot, usedNodes) {
  const target = slot?.target || {};
  if (target.cleanupPlaceholders === false) return [];
  const box = normalizedBox(target.cleanupBox) || normalizedBox(target.targetBox);
  if (!box) return [];

  const cleanupText = [
    ...DEFAULT_PLACEHOLDERS,
    ...stringList(target.placeholderText),
    ...stringList(target.cleanupPlaceholderText),
  ].map(normalizeSvgText).filter(Boolean);

  const cleaned = [];
  for (const entry of inventory) {
    if (!entry?.node || usedNodes.has(entry.node)) continue;
    if (!pointInsideBox(entry.center, box, 0)) continue;
    if (!cleanupText.includes(entry.normalizedText)) continue;
    setTextContent(entry.node, '');
    markCleanedPlaceholder(entry.node, slotLabel);
    usedNodes.add(entry.node);
    cleaned.push(entry);
  }
  return cleaned;
}

function hideMissingSlotGeometry(svgRoot, slotLabel, slot, options = {}, hiddenNodes = new Set()) {
  const target = slot?.target || {};
  if (target.hideGeometryWhenMissing !== true) return [];
  const box = normalizedBox(target.geometryBox) || null;
  if (!box || !svgRoot?.querySelectorAll) return [];

  const measure = typeof options.measureSvgElement === 'function' ? options.measureSvgElement : null;
  const hidden = [];
  for (const node of safeQueryAll(svgRoot, GEOMETRY_SELECTOR)) {
    if (!node || hiddenNodes.has(node) || TEXT_TAGS.has(tagName(node))) continue;
    const bbox = geometryBBox(node, svgRoot, measure);
    if (!bbox || !boxIntersectsObject(box, bbox)) continue;
    hideGeometryNode(node, slotLabel);
    hiddenNodes.add(node);
    hidden.push({ path: stableElementPath(node, svgRoot), node, bbox });
  }
  return hidden;
}

function geometryBBox(node, root, measure) {
  const local = safeMeasureElement(node, measure) || staticGeometryBox(node);
  if (!local) return null;
  const matrix = composedTransformMatrix(node, root);
  return transformBox(local, matrix) || local;
}

function safeMeasureElement(node, measure) {
  if (measure) {
    const box = normalizeBoxObject(measure(node));
    if (box) return box;
  }
  if (typeof node?.getBBox === 'function') {
    try {
      const box = normalizeBoxObject(node.getBBox());
      if (box) return box;
    } catch {
      // Detached/test SVG nodes commonly cannot measure geometry.
    }
  }
  return null;
}

function staticGeometryBox(node) {
  const tag = tagName(node);
  if (tag === 'line') {
    const x1 = firstNumberAttr(node, 'x1');
    const y1 = firstNumberAttr(node, 'y1');
    const x2 = firstNumberAttr(node, 'x2');
    const y2 = firstNumberAttr(node, 'y2');
    if ([x1, y1, x2, y2].every(Number.isFinite)) return boxFromPoints([{ x: x1, y: y1 }, { x: x2, y: y2 }]);
  }
  if (tag === 'rect') {
    const x = firstNumberAttr(node, 'x') || 0;
    const y = firstNumberAttr(node, 'y') || 0;
    const width = firstNumberAttr(node, 'width');
    const height = firstNumberAttr(node, 'height');
    if ([x, y, width, height].every(Number.isFinite)) return { x, y, width, height };
  }
  if (tag === 'circle') {
    const cx = firstNumberAttr(node, 'cx');
    const cy = firstNumberAttr(node, 'cy');
    const r = firstNumberAttr(node, 'r');
    if ([cx, cy, r].every(Number.isFinite)) return { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r };
  }
  if (tag === 'ellipse') {
    const cx = firstNumberAttr(node, 'cx');
    const cy = firstNumberAttr(node, 'cy');
    const rx = firstNumberAttr(node, 'rx');
    const ry = firstNumberAttr(node, 'ry');
    if ([cx, cy, rx, ry].every(Number.isFinite)) return { x: cx - rx, y: cy - ry, width: 2 * rx, height: 2 * ry };
  }
  if (tag === 'polyline' || tag === 'polygon') {
    const points = parsePointList(stringAttr(node, 'points'));
    if (points.length) return boxFromPoints(points);
  }
  if (tag === 'path') {
    const points = parsePathCoordinatePairs(stringAttr(node, 'd'));
    if (points.length) return boxFromPoints(points);
  }
  return null;
}

function hideGeometryNode(node, slotLabel) {
  if (!node?.setAttribute) return;
  if (!node.getAttribute?.('data-pipetools-previous-display')) {
    const previousDisplay = node.getAttribute?.('display');
    if (previousDisplay != null) node.setAttribute('data-pipetools-previous-display', previousDisplay);
  }
  if (!node.getAttribute?.('data-pipetools-previous-visibility')) {
    const previousVisibility = node.getAttribute?.('visibility');
    if (previousVisibility != null) node.setAttribute('data-pipetools-previous-visibility', previousVisibility);
  }
  node.setAttribute('data-pipetools-slot', slotLabel);
  node.setAttribute('data-pipetools-missing-slot-geometry-hidden', 'true');
  node.setAttribute('display', 'none');
  node.setAttribute('aria-hidden', 'true');
}

function markCleanedPlaceholder(node, slotLabel) {
  node?.setAttribute?.('data-pipetools-slot', slotLabel);
  node?.setAttribute?.('data-pipetools-placeholder-cleaned', 'true');
  node?.setAttribute?.('aria-hidden', 'true');
}

function allowedTargetTexts(slotLabel, slot, target) {
  return [
    ...DEFAULT_PLACEHOLDERS,
    ...stringList(target.placeholderText),
    ...stringList(target.allowedExistingText),
    ...stringList(slot.placeholderNear),
    ...stringList(slot.labelText),
    slot.displayLabel,
    slot.semanticLabel,
    slotLabel,
  ].map(normalizeSvgText).filter(Boolean);
}

function allowedTextScore(normalizedText, allowed) {
  if (!normalizedText && allowed.includes('')) return 0.2;
  if (allowed.includes(normalizedText)) return 0.2;
  if (allowed.some((text) => text && normalizedText.includes(text) && text.length >= 3)) return 0.12;
  return 0;
}

function labelMatchScore(normalizedText, labelTexts) {
  if (labelTexts.includes(normalizedText)) return 1;
  if (labelTexts.some((label) => label.length >= 3 && normalizedText.includes(label))) return 0.75;
  return 0;
}

function hasNearbyUnit(targetEntry, unitTextNearby, targetRegionEntries) {
  const units = stringList(unitTextNearby).map(normalizeSvgText);
  if (!units.length) return false;
  return targetRegionEntries.some((entry) => entry !== targetEntry && units.includes(entry.normalizedText) && distance(entry.center, targetEntry.center) <= 600);
}

function factList(row) {
  return [...dimensionFacts(row), ...weightFacts(row)].filter((fact) => isRenderable(fact?.label) && isRenderable(formatFact(fact)));
}

function factForSlot(facts, slotLabel, slot) {
  const wanted = [slotLabel, slot.semanticLabel, slot.displayLabel, ...stringList(slot.preferredValueKeys), ...stringList(slot.suppressOverlayLabels)].map(normalizedKey).filter(Boolean);
  return facts.find((fact) => {
    const candidates = [fact.label, fact.path].map(normalizedKey).filter(Boolean);
    return candidates.some((candidate) => wanted.includes(candidate));
  }) || null;
}

function effectiveSuppressLabels(slotLabel, slot, fact) {
  return [slotLabel, slot.semanticLabel, slot.displayLabel, fact.label, fact.path, ...stringList(slot.suppressOverlayLabels)]
    .filter(isRenderable);
}

function markPopulatedNode(node, slotLabel, factPath, confidence, slot = {}, slotBinding = {}) {
  node?.setAttribute?.('data-pipetools-slot', slotLabel);
  node?.setAttribute?.('data-pipetools-source-backed', 'true');
  node?.setAttribute?.('data-pipetools-native-value', 'true');
  node?.setAttribute?.('data-pipetools-slot-confidence', String(roundConfidence(confidence)));
  if (factPath) node?.setAttribute?.('data-pipetools-slot-source-path', factPath);
  if (factPath) node?.setAttribute?.('data-pipetools-fact-path', factPath);
  applyNativeSlotTextStyle(node, slot, slotBinding);
}

function applyNativeSlotTextStyle(node, slot = {}, slotBinding = {}) {
  if (!node?.setAttribute || slot.nativeTextStyle === false) return;
  const style = { ...DEFAULT_NATIVE_TEXT_STYLE, ...(slotBinding.nativeTextStyle || {}), ...(slot.nativeTextStyle || {}) };
  const className = [node.getAttribute?.('class'), 'pipetools-native-slot-value'].filter(Boolean).join(' ');
  node.setAttribute('class', className);
  node.setAttribute('font-size', String(style.fontSize));
  node.setAttribute('font-family', String(style.fontFamily));
  node.setAttribute('font-weight', String(style.fontWeight));
  node.setAttribute('fill', String(style.fill));
  if (style.stroke === false || style.stroke === 'none' || Number(style.strokeWidth) <= 0) {
    node.setAttribute('stroke', 'none');
    node.setAttribute('stroke-width', '0');
  } else {
    node.setAttribute('stroke', String(style.stroke));
    node.setAttribute('stroke-width', String(style.strokeWidth));
  }
  node.setAttribute('paint-order', 'stroke fill');
  node.setAttribute('stroke-linejoin', 'round');
  if (style.letterSpacing != null) node.setAttribute('letter-spacing', String(style.letterSpacing));
}

function setTextContent(node, value) {
  if (node) node.textContent = value;
}

function notPopulated(sourceCode, slot, confidence, reason, match = {}, cleaned = [], hidden = []) {
  return {
    sourceCode,
    slot,
    status: 'not-populated',
    confidence: roundConfidence(confidence),
    targetPath: match?.target?.path || '',
    targetTextBefore: match?.target?.text || '',
    targetTextAfter: '',
    matchedBy: match?.matchedBy || [],
    reason,
    suppressedOverlayLabels: [],
    cleanedPlaceholderPaths: cleaned.map((entry) => entry.path),
    cleanedPlaceholderCount: cleaned.length,
    hiddenGeometryPaths: hidden.map((entry) => entry.path),
    hiddenGeometryCount: hidden.length,
  };
}

function emitSlotDiagnostics(result, options) {
  const summary = slotDiagnosticsSummary(result);
  if (options.diagnosticsTarget?.dataset) {
    options.diagnosticsTarget.dataset.svgSlotDiagnostics = JSON.stringify(summary);
  }
  try {
    if (globalThis?.localStorage?.getItem?.('pipetools.svgSlotDebug') === '1') {
      console.debug?.('[PipeTools] SVG slot diagnostics', summary);
    }
  } catch {
    // localStorage can be blocked; diagnostics remain optional.
  }
}

function emptyResult(sourceCode) {
  return {
    sourceCode: sourceCode || '',
    populatedLabels: [],
    missingLabels: [],
    suppressedOverlayLabels: [],
    populatedCount: 0,
    failedCount: 0,
    confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
    cleanedPlaceholderCount: 0,
    cleanedPlaceholderPaths: [],
    hiddenGeometryCount: 0,
    hiddenGeometryPaths: [],
    slots: [],
  };
}

function confidenceThreshold(slotBinding, options) {
  const raw = Number(options.confidenceThreshold ?? slotBinding?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : DEFAULT_CONFIDENCE_THRESHOLD;
}

function normalizedBox(box) {
  if (!Array.isArray(box) || box.length !== 4) return null;
  const values = box.map(Number);
  if (!values.every(Number.isFinite) || values[0] >= values[2] || values[1] >= values[3]) return null;
  return values;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function stringList(value) {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function normalizedKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[._\s/\\-]+/g, '');
}

function isRenderable(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && !/^(?:—|–|-|null|undefined)$/i.test(text);
}

function roundConfidence(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : 0;
}

function safeQueryAll(root, selector) {
  try {
    return [...(root.querySelectorAll?.(selector) || [])];
  } catch {
    return [];
  }
}

function normalizeBoxObject(box) {
  if (!box) return null;
  const x = Number(box.x);
  const y = Number(box.y);
  const width = Number(box.width);
  const height = Number(box.height);
  if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) return null;
  return { x, y, width, height };
}

function boxIntersectsObject(box, objectBox) {
  if (!box || !objectBox) return false;
  const other = [objectBox.x, objectBox.y, objectBox.x + objectBox.width, objectBox.y + objectBox.height];
  const center = boxCenter(objectBox);
  return pointInsideBox(center, box, 0) || !(other[2] < box[0] || other[0] > box[2] || other[3] < box[1] || other[1] > box[3]);
}

function boxFromPoints(points) {
  const valid = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!valid.length) return null;
  const xs = valid.map((point) => point.x);
  const ys = valid.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function parsePointList(value) {
  const numbers = parseNumberList(value);
  const points = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] });
  }
  return points;
}

function parsePathCoordinatePairs(value) {
  return parsePointList(value);
}

function parseNumberList(value) {
  return String(value || '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number).filter(Number.isFinite) || [];
}

function composedTransformMatrix(node, root) {
  const chain = [];
  let current = node;
  while (current && current !== root?.parentNode) {
    chain.push(current);
    if (current === root) break;
    current = current.parentElement || current.parentNode || null;
  }
  return chain.reverse().reduce((matrix, item) => multiplyMatrices(matrix, parseSvgTransform(stringAttr(item, 'transform'))), [1, 0, 0, 1, 0, 0]);
}

function stableElementPath(node, root) {
  if (!node) return '';
  const parts = [];
  let current = node;
  while (current && current !== root?.parentNode) {
    const tag = tagName(current);
    if (!tag || tag === '#document') break;
    parts.push(`${tag}[${indexAmongSameTag(current)}]`);
    if (current === root) break;
    current = current.parentElement || current.parentNode || null;
  }
  return parts.reverse().join('/');
}

function indexAmongSameTag(node) {
  const tag = tagName(node);
  const parent = node.parentElement || node.parentNode;
  if (!parent?.children) return 1;
  let index = 0;
  for (const child of parent.children) {
    if (tagName(child) === tag) index += 1;
    if (child === node) return index;
  }
  return 1;
}

function tagName(node) {
  return String(node?.tagName || node?.nodeName || '').toLowerCase();
}

function stringAttr(node, name) {
  return typeof node?.getAttribute === 'function' ? String(node.getAttribute(name) ?? '').trim() : '';
}

function firstNumberAttr(node, name) {
  const raw = stringAttr(node, name);
  const first = String(raw || '').split(/[\s,]+/).find(Boolean);
  const value = Number(first);
  return Number.isFinite(value) ? value : NaN;
}
