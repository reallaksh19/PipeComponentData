import { dimensionFacts, formatFact, weightFacts } from '../dimensionDisplay.js';
import { requiredCalloutLabels } from './dimensionCalloutTemplates.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const MAX_SHOWN = 5;
const MAX_MISSING = 4;

export function renderDimensionCalloutDiagnostics(row, symbol, container, callouts = [], options = {}) {
  const canvas = container?.closest?.('.source-svg-canvas') || container?.querySelector?.('.source-svg-canvas') || document.querySelector('.source-svg-canvas');
  if (!canvas) return;
  clearDimensionCalloutDiagnostics(canvas);
  const model = diagnosticModel(row, symbol, callouts, options);
  const panel = document.createElement('div');
  panel.className = `dimension-diagnostics ${model.missing.length ? 'has-missing' : 'complete'}`;
  panel.dataset.dimensionDiagnostics = 'true';
  panel.innerHTML = diagnosticHtml(model);
  canvas.append(panel);
}

export function clearDimensionCalloutDiagnostics(scope = document) {
  scope?.querySelectorAll?.('[data-dimension-diagnostics]').forEach((node) => node.remove());
}

function diagnosticModel(row = {}, symbol = {}, callouts = [], options = {}) {
  const facts = factMap([...dimensionFacts(row), ...weightFacts(row)]);
  const required = requiredCalloutLabels(symbol);
  const renderedLabels = new Set(callouts.map((callout) => callout.label).filter(Boolean));
  const nativeSlots = nativeSlotRows(options.slotPopulation);
  const shown = [
    ...nativeSlots,
    ...[...renderedLabels]
      .map((label) => facts.get(label))
      .filter(Boolean)
      .map((fact) => ({ label: fact.label, value: formatFact(fact), path: fact.path || 'row', source: 'overlay callout' })),
  ].slice(0, MAX_SHOWN);
  const nativeLabels = new Set(nativeSlots.flatMap((slot) => [slot.label, slot.factLabel].filter(Boolean)));
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
    nativeCount: nativeSlots.length,
    failedNativeCount: failedNativeCount(options.slotPopulation),
  };
}

function nativeSlotRows(slotPopulation) {
  return (Array.isArray(slotPopulation?.slots) ? slotPopulation.slots : [])
    .filter((slot) => slot?.status === 'populated')
    .map((slot) => ({
      label: slot.slot || slot.factLabel || 'SVG slot',
      factLabel: slot.factLabel || '',
      value: slot.displayValue || slot.targetTextAfter || '',
      path: slot.factPath || slot.targetPath || 'SVG slot',
      source: 'native SVG slot',
    }))
    .filter((slot) => slot.label && slot.value);
}

function failedNativeCount(slotPopulation) {
  return (Array.isArray(slotPopulation?.slots) ? slotPopulation.slots : [])
    .filter((slot) => slot?.status && slot.status !== 'populated').length;
}

function diagnosticHtml(model) {
  const shown = model.shown.length
    ? model.shown.map((item) => `<span title="${esc(item.path || item.label)}"><b>${esc(item.label)}</b>${esc(item.value)}<em>${esc(item.source || item.path || 'row')}</em></span>`).join('')
    : '<span class="muted">No rendered DB dimension callouts.</span>';
  const missing = model.missing.length
    ? model.missing.map((label) => `<span class="missing-chip">${esc(label)}</span>`).join('')
    : '<span class="ok-chip">Major dimensions available</span>';
  const nativeStatus = model.nativeCount || model.failedNativeCount
    ? ` · ${esc(model.nativeCount)} native slots${model.failedNativeCount ? ` · ${esc(model.failedNativeCount)} slot misses` : ''}`
    : '';
  return `<strong>DB callout evidence</strong>
    <div class="dimension-diagnostics-summary">${esc(model.sourceCode)} · ${esc(model.renderedCount)} overlay callouts${nativeStatus} · ${esc(model.totalFacts)} DB facts</div>
    <div class="dimension-diagnostics-section">${shown}</div>
    <div class="dimension-diagnostics-missing"><b>Missing major</b>${missing}</div>`;
}

function factMap(facts) {
  const map = new Map();
  facts.filter(Boolean).forEach((fact) => {
    if (!map.has(fact.label)) map.set(fact.label, fact);
  });
  return map;
}
