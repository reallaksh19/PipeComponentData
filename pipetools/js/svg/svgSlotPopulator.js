import { dimensionFacts, formatFact, weightFacts } from '../dimensionDisplay.js';
import { buildSvgTextInventory, distance, normalizeSvgText, pointInsideBox } from './svgTextInventory.js';

const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;
const DEFAULT_PLACEHOLDERS = ['-', '–', '—'];
const TARGET_TOLERANCE = 50;

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
  const slots = [];

  for (const [slotLabel, slot] of slotEntries) {
    const fact = factForSlot(facts, slotLabel, slot);
    const value = fact ? formatFact(fact) : '';
    if (!fact || !isRenderable(value)) {
      missingLabels.push(slotLabel);
      slots.push(notPopulated(sourceCode, slotLabel, 0, 'no source-backed DB fact'));
      continue;
    }

    const match = matchTargetForSlot(inventory, slotLabel, slot, { threshold, usedNodes });
    if (!match || match.confidence < threshold || !match.target?.node || usedNodes.has(match.target.node)) {
      missingLabels.push(slotLabel);
      const confidence = match?.confidence ?? 0;
      const reason = match?.reason || `confidence ${confidence.toFixed(2)} below threshold ${threshold}`;
      slots.push(notPopulated(sourceCode, slotLabel, confidence, reason, match));
      continue;
    }

    const target = match.target;
    const before = target.text;
    setTextContent(target.node, value);
    markPopulatedNode(target.node, slotLabel, fact.path, match.confidence);
    usedNodes.add(target.node);

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
    slots: slots.map((slot) => ({
      slot: slot.slot,
      status: slot.status,
      confidence: slot.confidence,
      reason: slot.reason,
      targetPath: slot.targetPath || '',
      targetTextBefore: slot.targetTextBefore || '',
      targetTextAfter: slot.targetTextAfter || '',
      suppressedOverlayLabels: slot.suppressedOverlayLabels || [],
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

function markPopulatedNode(node, slotLabel, factPath, confidence) {
  node?.setAttribute?.('data-pipetools-slot', slotLabel);
  node?.setAttribute?.('data-pipetools-source-backed', 'true');
  node?.setAttribute?.('data-pipetools-slot-confidence', String(roundConfidence(confidence)));
  if (factPath) node?.setAttribute?.('data-pipetools-slot-source-path', factPath);
  if (factPath) node?.setAttribute?.('data-pipetools-fact-path', factPath);
}

function setTextContent(node, value) {
  if (node) node.textContent = value;
}

function notPopulated(sourceCode, slot, confidence, reason, match = {}) {
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
