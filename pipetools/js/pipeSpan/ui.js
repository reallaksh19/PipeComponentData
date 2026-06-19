import {
  calculatePipeSpan, calculatePipeSpanDetailRows, getPipeSpanSchedules,
  listPipeSpanRows, normalizePipeSpanInput,
} from './calculate.js';
import { PIPE_SPAN_CONSTANT_FIELDS } from './catalog.js';
import { renderPipeSpanDetailTable } from './detailedTable.js';

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (ch) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmt = (value, unit = '') => value == null ? '—' : `${esc(value)}${unit ? ` ${esc(unit)}` : ''}`;
const kv = (label, value) => `<div class="kv"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;

export function renderPipeSpanInputs(host) {
  host.innerHTML = `<section class="strip pipe-span-source-strip"><div class="strip-title">Pipe Span</div><div class="segment-row">
    <span class="chip">Source style: CRF-4-1 / Misc Calc</span>
    <span class="chip">Header + engineering sketch + formula console</span>
    <span class="chip">Detailed workbook view added from user table</span>
  </div></section>`;
}

export function renderPipeSpanMain(state, actionOrSvg, maybeSvg) {
  const actions = typeof actionOrSvg === 'object' && actionOrSvg ? actionOrSvg : {};
  const pipeSpanSvg = typeof maybeSvg === 'function' ? maybeSvg : typeof actionOrSvg === 'function' ? actionOrSvg : () => '';
  const input = normalizePipeSpanInput(state.spanInput);
  const result = calculatePipeSpan(input);
  const detailRows = input.showDetailed ? calculatePipeSpanDetailRows(input) : [];
  const frame = document.getElementById('table-frame');
  document.getElementById('table-title').textContent = 'Pipe Span';
  document.getElementById('table-kicker').textContent = 'CRF-style Misc Calc layout with native Excel-derived calculation trace';
  document.getElementById('table-count').textContent = `NPS ${result.input.nps} · ${result.input.schedule}`;
  frame.innerHTML = layout(input, result, detailRows, pipeSpanSvg);
  bindPipeSpanInputs(frame, actions, input);
  document.getElementById('inspector-body').innerHTML = '<p>Formula trace moved to the Pipe Span Formula Console.</p>';
}

function layout(input, result, detailRows, pipeSpanSvg) {
  return `<div class="pipe-span-shell no-calculator-rail">
    <section class="pipe-span-main"><header class="pipe-span-header"><div><h3>Pipe Span</h3><p>Native calculation with method comparison and trace console.</p></div>
        <label>Unit Mode<select id="span-unit-mode"><option selected>Native</option><option disabled>SI</option><option disabled>Imperial</option></select></label></header>
      <div class="pipe-span-body"><div class="pipe-span-center">${inputPanel(input)}${resultCards(result)}${resultTable(result)}${detailRows.length ? renderPipeSpanDetailTable(detailRows) : ''}</div>
        <aside class="pipe-span-sketch"><h4>Engineering Sketch</h4>${pipeSpanSvg(result)}</aside></div>
      <footer class="pipe-span-console"><h4>Formula Console</h4>${traceTable(result.formulaTrace)}</footer></section>
  </div>`;
}

function inputPanel(input) {
  const uniqueNps = [...new Set(listPipeSpanRows().map((row) => row.nps))];
  const constantInputs = PIPE_SPAN_CONSTANT_FIELDS.map((field) => inputNumber(field, input[field.key])).join('');
  return `<section class="pipe-span-card"><div class="pipe-span-detail-head"><h4>Inputs</h4>
    <button class="icon-btn" id="span-detail-toggle" type="button" aria-pressed="${input.showDetailed}">&#9638; Detailed View</button></div>
    <div class="input-grid pipe-span-inputs"><label>NPS<select id="span-nps">${options(uniqueNps, input.nps, Number)}</select></label>
      <label>Schedule<select id="span-schedule">${options(getPipeSpanSchedules(input.nps), input.schedule)}</select></label>
      <label>Service<select id="span-service">${options(['VAPOUR', 'WATER'], input.service)}</select></label>
      <label>Insulation<select id="span-insulation">${options(['BARE', 'INSULATED'], input.insulation)}</select></label>
      <label>Material<select id="span-material">${options(['CS', 'SS'], input.material)}</select></label>
      <label>Method<select id="span-beamMethod">${options(['CONTINUOUS', 'AVERAGE', 'FIXED', 'SIMPLY'], input.beamMethod)}</select></label>
      ${constantInputs}<button class="primary" id="span-calc" type="button">Calculate Span</button></div></section>`;
}

function inputNumber(field, value) {
  return `<label>${esc(field.label)}<small>${esc(field.unit)}</small><input id="span-${esc(field.key)}" type="number" step="${esc(field.step)}" value="${esc(value)}"></label>`;
}

function resultCards(result) {
  return `<section class="pipe-span-cards"><div>${kv('Selected method span', fmt(result.selectedMethodSpanM, 'm'))}</div><div>${kv('Least allowable span', fmt(result.leastAllowableSpanM, 'm'))}</div><div>${kv('Governing span', fmt(result.governingSpanM, 'm'))}</div><div>${kv('Ref. span', fmt(result.qmsReferenceM, 'm'))}</div></section>`;
}

function resultTable(result) {
  const rows = [
    ['Pipe weight', result.pipeWeightNPerM, 'N/m'], ['Insulation weight', result.insulationWeightNPerM, 'N/m'],
    ['Water weight', result.waterWeightNPerM, 'N/m'], ['Total weight', result.totalWeightNPerM, 'N/m'],
    ['Moment of inertia', result.momentOfInertiaCm4, 'cm4'], ['Continuous span', result.continuousDeflectionM, 'm'],
    ['Average span', result.averageDeflectionM, 'm'], ['Fixed span', result.fixedDeflectionM, 'm'],
    ['Simply supported span', result.simplyDeflectionM, 'm'], ['Indentation span', result.indentationSpanM, 'm'],
    ['Governing span', result.governingSpanM, 'm'],
  ];
  return `<section class="pipe-span-card"><h4>Results</h4><table class="pipe-span-table"><thead><tr><th>Output</th><th>Value</th><th>Unit</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${esc(row[0])}</td><td>${fmt(row[1])}</td><td>${esc(row[2])}</td></tr>`).join('')}</tbody></table></section>`;
}

function traceTable(trace) {
  return `<table class="pipe-span-trace"><thead><tr><th>Step</th><th>Formula</th><th>Result</th></tr></thead><tbody>${trace.map((step) => `<tr><td>${esc(step.label)}</td><td>${esc(step.formula)}</td><td>${fmt(step.result, step.unit)}</td></tr>`).join('')}</tbody></table>`;
}

function bindPipeSpanInputs(frame, actions, input) {
  if (!frame?.querySelector || typeof actions.updateSpanInput !== 'function') return;
  frame.querySelector('#span-calc')?.addEventListener('click', () => actions.updateSpanInput(readSpanInputs(frame, input)));
  frame.querySelector('#span-detail-toggle')?.addEventListener('click', () => actions.updateSpanInput({ showDetailed: !input.showDetailed }));
  frame.querySelectorAll('.pipe-span-inputs select, .pipe-span-inputs input').forEach((control) => control.addEventListener('change', () => actions.updateSpanInput(readSpanInputs(frame, input))));
}

function readSpanInputs(frame, input) {
  const value = (id) => frame.querySelector(`#span-${id}`)?.value;
  const constants = Object.fromEntries(PIPE_SPAN_CONSTANT_FIELDS.map(({ key }) => [key, Number(value(key))]));
  return normalizePipeSpanInput({ ...input, ...constants, nps: Number(value('nps')), schedule: value('schedule'), service: value('service'), insulation: value('insulation'), material: value('material'), beamMethod: value('beamMethod') });
}

function options(values, selected, mapper = String) {
  return values.map((value) => `<option ${mapper(value) === mapper(selected) ? 'selected' : ''}>${esc(value)}</option>`).join('');
}
