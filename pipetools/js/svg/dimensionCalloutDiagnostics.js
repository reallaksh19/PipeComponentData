import { dimensionFacts, formatFact, weightFacts } from '../dimensionDisplay.js';
import { requiredCalloutLabels } from './dimensionCalloutTemplates.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const MAX_SHOWN = 5;
const MAX_MISSING = 4;

export function renderDimensionCalloutDiagnostics(row, symbol, container, callouts = []) {
  const canvas = container?.closest?.('.source-svg-canvas') || container?.querySelector?.('.source-svg-canvas') || document.querySelector('.source-svg-canvas');
  if (!canvas) return;
  clearDimensionCalloutDiagnostics(canvas);
  const model = diagnosticModel(row, symbol, callouts);
  const panel = document.createElement('div');
  panel.className = `dimension-diagnostics ${model.missing.length ? 'has-missing' : 'complete'}`;
  panel.dataset.dimensionDiagnostics = 'true';
  panel.innerHTML = diagnosticHtml(model);
  canvas.append(panel);
}

export function clearDimensionCalloutDiagnostics(scope = document) {
  scope?.querySelectorAll?.('[data-dimension-diagnostics]').forEach((node) => node.remove());
}

function diagnosticModel(row = {}, symbol = {}, callouts = []) {
  const facts = factMap([...dimensionFacts(row), ...weightFacts(row)]);
  const required = requiredCalloutLabels(symbol);
  const renderedLabels = new Set(callouts.map((callout) => callout.label).filter(Boolean));
  const shown = [...renderedLabels]
    .map((label) => facts.get(label))
    .filter(Boolean)
    .slice(0, MAX_SHOWN);
  const missing = required
    .filter((label) => !facts.has(label))
    .slice(0, MAX_MISSING);
  return {
    sourceCode: symbol?.sourceCode || symbol?.code || 'DXF',
    family: symbol?.family || 'UNKNOWN',
    shown,
    missing,
    totalFacts: facts.size,
    renderedCount: callouts.length,
  };
}

function diagnosticHtml(model) {
  const shown = model.shown.length
    ? model.shown.map((fact) => `<span title="${esc(fact.path || fact.label)}"><b>${esc(fact.label)}</b>${esc(formatFact(fact))}<em>${esc(fact.path || 'row')}</em></span>`).join('')
    : '<span class="muted">No rendered DB dimension callouts.</span>';
  const missing = model.missing.length
    ? model.missing.map((label) => `<span class="missing-chip">${esc(label)}</span>`).join('')
    : '<span class="ok-chip">Major dimensions available</span>';
  return `<strong>DB callout evidence</strong>
    <div class="dimension-diagnostics-summary">${esc(model.sourceCode)} · ${esc(model.renderedCount)} shown · ${esc(model.totalFacts)} DB facts</div>
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
