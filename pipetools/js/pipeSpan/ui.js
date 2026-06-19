import { calculatePipeSpan, getPipeSpanSchedules, listPipeSpanRows, normalizePipeSpanInput } from './calculate.js';

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (ch) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmt = (value, unit = '') => value == null ? '—' : `${esc(value)}${unit ? ` ${esc(unit)}` : ''}`;
const kv = (label, value) => `<div class="kv"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;

export function renderPipeSpanInputs(host) {
  host.innerHTML = `<section class="strip pipe-span-source-strip"><div class="strip-title">Pipe Span</div><div class="segment-row">
    <span class="chip">Source style: CRF-4-1 / Misc Calc</span>
    <span class="chip">Calculator rail + header + right engineering sketch + console</span>
    <span class="chip">SVG files excluded; pending user-supplied SVG package</span>
  </div></section>`;
}

export function renderPipeSpanMain(state, actionOrSvg, maybeSvg) {
  const actions = typeof actionOrSvg === 'object' && actionOrSvg ? actionOrSvg : {};
  const pipeSpanSvg = typeof maybeSvg === 'function' ? maybeSvg : typeof actionOrSvg === 'function' ? actionOrSvg : () => '';
  const input = normalizePipeSpanInput(state.spanInput);
  const result = calculatePipeSpan(input);
  const frame = document.getElementById('table-frame');
  document.getElementById('table-title').textContent = 'Pipe Span';
  document.getElementById('table-kicker').textContent = 'CRF-style Misc Calc layout with native Excel-derived calculation trace';
  document.getElementById('table-count').textContent = `NPS ${result.input.nps} · ${result.input.schedule}`;
  frame.innerHTML = layout(input, result, pipeSpanSvg);
  bindPipeSpanInputs(frame, actions);
  document.getElementById('inspector-body').innerHTML = '<p>Formula trace moved to the Pipe Span Formula Console.</p>';
}

function layout(input, result, pipeSpanSvg) {
  return `<div class="pipe-span-shell">
    <aside class="pipe-span-rail">
      <h4>Calculators</h4><button class="pipe-span-nav active" type="button">Pipe Span</button>
      <button class="pipe-span-nav" type="button" disabled>Pipe Shell Indentation</button>
      <button class="pipe-span-nav" type="button" disabled>Welded Shoe</button>
      <button class="pipe-span-nav" type="button" disabled>Trunnion Calc</button>
    </aside>
    <section class="pipe-span-main">
      <header class="pipe-span-header">
        <div><h3>Pipe Span</h3><p>Native calculation with method comparison and trace console.</p></div>
        <label>Unit Mode<select id="span-unit-mode"><option selected>Native</option><option disabled>SI</option><option disabled>Imperial</option></select></label>
      </header>
      <div class="pipe-span-body"><div class="pipe-span-center">${inputPanel(input)}${resultCards(result)}${resultTable(result)}</div>
        <aside class="pipe-span-sketch"><h4>Engineering Sketch</h4>${pipeSpanSvg(result)}</aside></div>
      <footer class="pipe-span-console"><h4>Formula Console</h4>${traceTable(result.formulaTrace)}</footer>
    </section>
  </div>`;
}

function inputPanel(input) {
  const uniqueNps = [...new Set(listPipeSpanRows().map((row) => row.nps))];
  const sizes = options(uniqueNps, input.nps, Number);
  const schedules = options(getPipeSpanSchedules(input.nps), input.schedule);
  return `<section class="pipe-span-card"><h4>Inputs</h4><div class="input-grid pipe-span-inputs">
    <label>NPS<select id="span-nps">${sizes}</select></label>
    <label>Schedule<select id="span-schedule">${schedules}</select></label>
    <label>Service<select id="span-service">${options(['VAPOUR', 'WATER'], input.service)}</select></label>
    <label>Insulation<select id="span-insulation">${options(['BARE', 'INSULATED'], input.insulation)}</select></label>
    <label>Material<select id="span-material">${options(['CS', 'SS'], input.material)}</select></label>
    <label>Method<select id="span-beamMethod">${options(['CONTINUOUS', 'AVERAGE', 'FIXED', 'SIMPLY'], input.beamMethod)}</select></label>
    <button class="primary" id="span-calc" type="button">Calculate Span</button>
  </div></section>`;
}

function resultCards(result) {
  return `<section class="pipe-span-cards">
    <div>${kv('Selected method span', fmt(result.selectedMethodSpanM, 'm'))}</div>
    <div>${kv('Least allowable span', fmt(result.leastAllowableSpanM, 'm'))}</div>
    <div>${kv('Governing span', fmt(result.governingSpanM, 'm'))}</div>
    <div>${kv('QMS reference', fmt(result.qmsReferenceM, 'm'))}</div>
  </section>`;
}

function resultTable(result) {
  const rows = [
    ['Pipe weight', result.pipeWeightNPerM, 'N/m'], ['Insulation weight', result.insulationWeightNPerM, 'N/m'],
    ['Water weight', result.waterWeightNPerM, 'N/m'], ['Total weight', result.totalWeightNPerM, 'N/m'],
    ['Moment of inertia', result.momentOfInertiaCm4, 'cm4'], ['Continuous span', result.continuousSpanM, 'm'],
    ['Average span', result.averageSpanM, 'm'], ['Fixed span', result.fixedSpanM, 'm'],
    ['Simply supported span', result.simplySpanM, 'm'], ['Indentation span', result.indentationSpanM, 'm'],
    ['Governing span', result.governingSpanM, 'm'],
  ];
  return `<section class="pipe-span-card"><h4>Results</h4><table class="pipe-span-table"><thead><tr><th>Output</th><th>Value</th><th>Unit</th></tr></thead><tbody>${
    rows.map((row) => `<tr><td>${esc(row[0])}</td><td>${fmt(row[1])}</td><td>${esc(row[2])}</td></tr>`).join('')
  }</tbody></table></section>`;
}

function traceTable(trace) {
  return `<table class="pipe-span-trace"><thead><tr><th>Step</th><th>Formula</th><th>Result</th></tr></thead><tbody>${
    trace.map((step) => `<tr><td>${esc(step.label)}</td><td>${esc(step.formula)}</td><td>${fmt(step.result, step.unit)}</td></tr>`).join('')
  }</tbody></table>`;
}

function bindPipeSpanInputs(frame, actions) {
  if (!frame?.querySelector || typeof actions.updateSpanInput !== 'function') return;
  frame.querySelector('#span-calc')?.addEventListener('click', () => actions.updateSpanInput(readSpanInputs(frame)));
  frame.querySelectorAll('.pipe-span-inputs select').forEach((select) =>
    select.addEventListener('change', () => actions.updateSpanInput(readSpanInputs(frame))));
}

function readSpanInputs(frame) {
  const value = (id) => frame.querySelector(`#span-${id}`)?.value;
  return normalizePipeSpanInput({ nps: Number(value('nps')), schedule: value('schedule'), service: value('service'),
    insulation: value('insulation'), material: value('material'), beamMethod: value('beamMethod') });
}

function options(values, selected, mapper = String) {
  return values.map((value) => `<option ${mapper(value) === mapper(selected) ? 'selected' : ''}>${esc(value)}</option>`).join('');
}
