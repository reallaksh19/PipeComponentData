import { dimensionFacts, formatFact, weightFacts } from '../dimensionDisplay.js';
import { requiredCalloutLabels } from './dimensionCalloutTemplates.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const MAX_SHOWN = 5;
const MAX_MISSING = 4;
const CLEANUP_ONLY_SLOT_LABELS = new Set(['outside radius']);

export function renderDimensionCalloutDiagnostics(row, symbol, container, callouts = [], options = {}) {
  const canvas = container?.closest?.('.source-svg-canvas') || container?.querySelector?.('.source-svg-canvas') || document.querySelector('.source-svg-canvas');
  if (!canvas) return;
  clearDimensionCalloutDiagnostics(canvas);
  const model = buildDimensionCalloutDiagnosticModel(row, symbol, callouts, options);
  const panel = document.createElement('details');
  panel.className = `dimension-diagnostics ${model.missing.length ? 'has-missing' : 'complete'}`;
  panel.dataset.dimensionDiagnostics = 'true';
  panel.dataset.collapsedByDefault = 'true';
  if (options.openDiagnostics === true) panel.open = true;
  panel.innerHTML = diagnosticHtml(model);
  canvas.append(panel);
}

export function clearDimensionCalloutDiagnostics(scope = document) {
  scope?.querySelectorAll?.('[data-dimension-diagnostics]').forEach((node) => node.remove());
}

export function buildDimensionCalloutDiagnosticModel(row = {}, symbol = {}, callouts = [], options = {}) {
  const facts = factMap([...dimensionFacts(row), ...weightFacts(row)]);
  const required = requiredCalloutLabels(symbol);
  const renderedLabels = new Set(callouts.map((callout) => callout.label).filter(Boolean));
  const native = nativeSlotDiagnostics(options.slotPopulation, { facts, required });
  const shown = [
    ...native.populatedSlots,
    ...[...renderedLabels]
      .map((label) => facts.get(label))
      .filter(Boolean)
      .map((fact) => ({ label: fact.label, value: formatFact(fact), path: fact.path || 'row', source: 'overlay callout' })),
  ].slice(0, MAX_SHOWN);
  const nativeLabels = new Set(native.populatedSlots.flatMap((slot) => [slot.label, slot.factLabel].filter(Boolean)));
  const missing = required
    .filter((label) => !facts.has(label) && !nativeLabels.has(label))
    .slice(0, MAX_MISSING);
  return {
    sourceCode: symbol?.sourceCode || symbol?.code || 'DXF',
    family: symbol?.family || 'UNKNOWN',
    shown,
    missing,
    totalFacts: facts.size,
    renderedCount: callouts.length,
    nativeCount: native.populatedSlots.length,
    failedNativeCount: native.failedSlots.length,
    hiddenNativeCleanupCount: native.hiddenCleanupSlots.length,
    hiddenNativeCleanupSlots: native.hiddenCleanupSlots,
  };
}

function nativeSlotDiagnostics(slotPopulation, context) {
  const slots = Array.isArray(slotPopulation?.slots) ? slotPopulation.slots : [];
  const populatedSlots = slots
    .filter((slot) => slot?.status === 'populated')
    .map((slot) => ({
      label: slot.slot || slot.factLabel || 'SVG slot',
      factLabel: slot.factLabel || '',
      value: slot.displayValue || slot.targetTextAfter || '',
      path: slot.factPath || slot.targetPath || 'SVG slot',
      source: 'native SVG slot',
    }))
    .filter((slot) => slot.label && slot.value);
  const failed = slots.filter((slot) => slot?.status && slot.status !== 'populated');
  const hiddenCleanupSlots = failed.filter((slot) => isHiddenNativeCleanupSlot(slot, context));
  const cleanup = new Set(hiddenCleanupSlots);
  return {
    populatedSlots,
    hiddenCleanupSlots,
    failedSlots: failed.filter((slot) => !cleanup.has(slot)),
  };
}

function isHiddenNativeCleanupSlot(slot, { facts, required }) {
  const labels = [slot.slot, slot.factLabel].filter(Boolean);
  const isRequired = labels.some((label) => required.includes(label));
  const hasFact = labels.some((label) => facts.has(label));
  const hiddenCount = Number(slot.hiddenGeometryCount || 0) + Number(slot.hiddenArtifactCount || 0);
  const reason = String(slot.reason || slot.purpose || '').toLowerCase();
  const cleanupOnlyLabel = labels.some((label) => CLEANUP_ONLY_SLOT_LABELS.has(String(label).trim().toLowerCase()));
  return !isRequired && !hasFact && (hiddenCount > 0 || reason.includes('cleanup') || cleanupOnlyLabel);
}

function diagnosticHtml(model) {
  const shown = model.shown.length
    ? model.shown.map((item) => `<span title="${esc(item.path || item.label)}"><b>${esc(item.label)}</b>${esc(item.value)}<em>${esc(item.source || item.path || 'row')}</em></span>`).join('')
    : '<span class="muted">No rendered DB dimension callouts.</span>';
  const missing = model.missing.length
    ? `<div class="dimension-diagnostics-missing"><b>Missing major</b>${model.missing.map((label) => `<span class="missing-chip">${esc(label)}</span>`).join('')}</div>`
    : '<div class="dimension-diagnostics-missing"><span class="ok-chip">Major dimensions available</span></div>';
  const nativeStatus = nativeStatusText(model);
  return `<summary><strong>DB callout evidence</strong><span class="dimension-diagnostics-summary">${esc(model.sourceCode)} · ${esc(model.renderedCount)} overlay callouts${nativeStatus} · ${esc(model.totalFacts)} DB facts</span></summary>
    <div class="dimension-diagnostics-body">
      <div class="dimension-diagnostics-section">${shown}</div>
      ${missing}
    </div>`;
}

function nativeStatusText(model) {
  const parts = [];
  if (model.nativeCount) parts.push(`${model.nativeCount} populated native slots`);
  if (model.hiddenNativeCleanupCount) parts.push(`${model.hiddenNativeCleanupCount} hidden native cleanup`);
  if (model.failedNativeCount) parts.push(`${model.failedNativeCount} slot misses`);
  return parts.length ? ` · ${parts.map(esc).join(' · ')}` : '';
}

function factMap(facts) {
  const map = new Map();
  facts.filter(Boolean).forEach((fact) => {
    if (!map.has(fact.label)) map.set(fact.label, fact);
  });
  return map;
}
