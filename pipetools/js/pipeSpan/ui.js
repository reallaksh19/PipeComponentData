import { calculatePipeSpan, getPipeSpanSchedules, listPipeSpanRows } from './calculate.js';

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (ch) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const kv = (label, value) => `<div class="kv"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;

export function renderPipeSpanInputs(host, state, actions) {
  const uniqueNps = [...new Set(listPipeSpanRows().map((row) => row.nps))];
  const sizes = uniqueNps.map((nps) => `<option ${Number(nps) === Number(state.spanInput.nps) ? 'selected' : ''}>${nps}</option>`);
  const schedules = getPipeSpanSchedules(state.spanInput.nps).map((schedule) =>
    `<option ${schedule === state.spanInput.schedule ? 'selected' : ''}>${esc(schedule)}</option>`);
  host.innerHTML = `<section class="strip"><div class="strip-title">Pipe Span Inputs</div><div class="input-grid">
    <label>NPS<select id="span-nps">${sizes.join('')}</select></label>
    <label>Schedule<select id="span-schedule">${schedules.join('')}</select></label>
    <label>Service<select id="span-service"><option>VAPOUR</option><option>WATER</option></select></label>
    <label>Insulation<select id="span-insulation"><option>BARE</option><option>INSULATED</option></select></label>
    <label>Material<select id="span-material"><option>CS</option><option>SS</option></select></label>
    <label>Method<select id="span-beamMethod"><option>CONTINUOUS</option><option>AVERAGE</option><option>FIXED</option><option>SIMPLY</option></select></label>
    <button class="primary" id="span-calc">Calculate Span</button>
  </div></section>`;
  for (const id of ['service', 'insulation', 'material', 'beamMethod']) document.getElementById(`span-${id}`).value = state.spanInput[id];
  document.getElementById('span-calc').addEventListener('click', () => actions.updateSpanInput(readSpanInputs()));
  host.querySelectorAll('select').forEach((select) => select.addEventListener('change', () => actions.updateSpanInput(readSpanInputs())));
}

function readSpanInputs() {
  return {
    nps: Number(document.getElementById('span-nps').value),
    schedule: document.getElementById('span-schedule').value,
    service: document.getElementById('span-service').value,
    insulation: document.getElementById('span-insulation').value,
    material: document.getElementById('span-material').value,
    beamMethod: document.getElementById('span-beamMethod').value,
  };
}

export function renderPipeSpanMain(state, pipeSpanSvg) {
  const result = calculatePipeSpan(state.spanInput);
  document.getElementById('table-title').textContent = 'Pipe Span';
  document.getElementById('table-kicker').textContent = 'Native Excel-derived formula trace';
  document.getElementById('table-count').textContent = `NPS ${state.spanInput.nps}`;
  document.getElementById('table-frame').innerHTML = resultTable(result);
  document.getElementById('inspector-body').innerHTML = `${pipeSpanSvg(result)}${summary(result)}${traceTable(result.formulaTrace)}`;
}

function resultTable(result) {
  const rows = [
    ['Pipe weight', result.pipeWeightNPerM, 'N/m'],
    ['Insulation weight', result.insulationWeightNPerM, 'N/m'],
    ['Water weight', result.waterWeightNPerM, 'N/m'],
    ['Total weight', result.totalWeightNPerM, 'N/m'],
    ['Moment of inertia', result.momentOfInertiaCm4, 'cm4'],
    ['Continuous stress span', result.continuousStressM, 'm'],
    ['Continuous deflection span', result.continuousDeflectionM, 'm'],
    ['Governing span', result.governingSpanM, 'm'],
    ['QMS reference', result.qmsReferenceM ?? '—', 'm'],
  ];
  return `<table><thead><tr><th>Result</th><th>Value</th><th>Unit</th></tr></thead><tbody>${
    rows.map((row) => `<tr><td>${esc(row[0])}</td><td>${esc(row[1])}</td><td>${esc(row[2])}</td></tr>`).join('')
  }</tbody></table>`;
}

function summary(result) {
  return `${kv('Service', result.input.service)}${kv('Insulation', result.input.insulation)}${kv('Schedule', result.row.schedule)}${kv('Governing span', `${result.governingSpanM} m`)}${kv('QMS ref.', `${result.qmsReferenceM ?? '—'} m`)}`;
}

function traceTable(trace) {
  return `<h4>Formula trace</h4><table><thead><tr><th>Step</th><th>Formula</th><th>Result</th></tr></thead><tbody>${
    trace.map((step) => `<tr><td>${esc(step.label)}</td><td>${esc(step.formula)}</td><td>${esc(step.result)} ${esc(step.unit)}</td></tr>`).join('')
  }</tbody></table>`;
}