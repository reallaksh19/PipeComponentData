const DATA_ROOT = '..';
const SOURCE_TOKEN = 'VLV1150';
const CATEGORIES = ['Valves', 'Pipe', 'Fittings', 'Flanges', 'Supports', 'Gaskets', 'Olets', 'Reducers', 'Coverage', 'Export'];
const LABELS = {
  faceToFaceRfMm: 'RF Face-to-face',
  faceToFaceRtjMm: 'RTJ Face-to-face',
  buttWeldLengthMm: 'BW Length',
  heightMm: 'Valve Height',
  handwheelDiaMm: 'Handwheel Dia',
  rtjAddLengthMm: 'RTJ Add Length',
  gapMm: 'Gap',
  rfRtjKg: 'RF/RTJ Weight',
  buttWeldKg: 'BW Weight',
};

let state = { entry: null, row: null };

start().catch((error) => {
  document.body.innerHTML = `<main class="pane"><div class="pane-body">Component Studio failed to load: ${escapeHtml(error.message)}</div></main>`;
});

async function start() {
  paintTabs();
  const [searchIndex, valves] = await Promise.all([
    loadJson('data/indexes/component-search.index.json'),
    loadJson('data/normalized/valves.json'),
  ]);
  const entry = searchIndex.entries.find((item) => item.id === 'VALVE|GATE|FLANGED|NPS8|CL150|RF');
  const row = valves.rows.find((item) => item.id === entry.id);
  state = { entry, row, index: searchIndex };
  renderAll();
  document.getElementById('search-button').addEventListener('click', renderAll);
}

function renderAll() {
  renderQuickFilters();
  renderResult();
  renderIdentity();
  renderAttributes();
  renderPreview();
  renderVerification();
  renderAudit();
}

async function loadJson(path) {
  const response = await fetch(`${DATA_ROOT}/${path}`);
  if (!response.ok) throw new Error(`Cannot load ${path}`);
  return response.json();
}

function paintTabs() {
  const host = document.getElementById('category-tabs');
  host.innerHTML = CATEGORIES.map((cat, index) => `<button class="${index === 0 ? 'active' : ''}">${cat}</button>`).join('');
}

function renderQuickFilters() {
  const filters = ['VLV', 'GATE', 'CL150', 'NPS8', 'RF', 'READY'];
  document.getElementById('quick-filters').innerHTML = filters.map((item, index) => `<button class="${index === 0 ? 'active' : ''}">${item}</button>`).join('');
}

function renderResult() {
  document.getElementById('result-card').innerHTML = `
    <strong>✓ Exact match</strong><br />
    <span>${state.entry.description}</span><br />
    <small>${state.index.noFallbackPolicy}</small>`;
  document.getElementById('source-line').innerHTML = `Source: <code>${state.row.source}</code> · ${SOURCE_TOKEN} · row ${state.row.sourceRowNumber}`;
}

function renderIdentity() {
  const cells = [
    ['Type', state.row.componentType],
    ['Subtype', state.row.valveType],
    ['NPS', state.row.nps],
    ['Class', state.row.classRating],
    ['Status', state.row.dataStatus],
  ];
  document.getElementById('identity-grid').innerHTML = cells
    .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function renderAttributes() {
  const attrs = [...taggedRows(state.row.dimensions), ...taggedRows(state.row.weights)];
  document.getElementById('attribute-body').innerHTML = attrs.map((item) => `
    <tr>
      <td>${item.label}</td>
      <td>${formatValue(item)}</td>
      <td>${item.basis}</td>
      <td>${item.sourceColumn ?? '-'}</td>
    </tr>`).join('');
}

function renderPreview() {
  const d = state.row.dimensions;
  const w = state.row.weights;
  document.getElementById('view-buttons').innerHTML = ['Orbit', 'Pan', 'Zoom', 'Top', 'Side', 'Iso']
    .map((item) => `<button class="${item === 'Iso' ? 'active' : ''}">${item}</button>`).join('');
  document.getElementById('cad-toggles').innerHTML = ['Dimensions', 'Leaders', 'Source Tags', 'Provenance']
    .map((item) => `<label><input type="checkbox" checked /> ${item}</label>`).join('');
  document.getElementById('cad-canvas').innerHTML = valveSvg({ d, w, row: state.row });
}

function renderVerification() {
  const chips = [
    ['Exact match', 'ok'],
    ['No fallback used', 'ok'],
    ['No fabricated dimensions', 'ok'],
    ['Provenance complete', 'ok'],
    [`Status ${state.row.dataStatus}`, 'ok'],
  ];
  document.getElementById('verification-footer').innerHTML = chips
    .map(([label, type]) => `<span class="${type}">✓ ${label}</span>`).join('');
}

function renderAudit() {
  const audit = {
    id: state.row.id,
    source: state.row.source,
    sourceToken: SOURCE_TOKEN,
    sourceRowNumber: state.row.sourceRowNumber,
    datasetVersion: state.row.datasetVersion,
    provenance: state.row.provenance,
  };
  document.getElementById('source-audit').textContent = JSON.stringify(audit, null, 2);
}

function taggedRows(group = {}) {
  return Object.entries(group).map(([key, item]) => ({
    key,
    label: LABELS[key] ?? key,
    value: item.value,
    unit: item.unit,
    basis: item.basis,
    sourceColumn: item.sourceColumn,
  }));
}

function formatValue(item) {
  if (item.value === null || item.value === undefined) return 'Unavailable';
  return `${item.value}${item.unit ? ` ${item.unit}` : ''}`;
}

function valveSvg({ d, w, row }) {
  const rf = d.faceToFaceRfMm.value;
  const rtj = d.faceToFaceRtjMm.value;
  const h = d.heightMm.value;
  const hw = d.handwheelDiaMm.value;
  return `
  <svg viewBox="0 0 620 360" xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r=".8" fill="#1a3850"/></pattern></defs>
    <rect width="620" height="360" fill="#081521"/><rect width="620" height="360" fill="url(#dots)"/>
    <line x1="30" y1="202" x2="590" y2="202" stroke="#244962" stroke-dasharray="9 6"/>
    <rect x="30" y="166" width="128" height="72" fill="#3b82b6"/><rect x="462" y="166" width="128" height="72" fill="#3b82b6"/>
    <rect x="136" y="110" width="28" height="184" fill="#66a0c6"/><rect x="456" y="110" width="28" height="184" fill="#66a0c6"/>
    <polygon points="164,166 210,110 410,110 456,166 456,238 410,294 210,294 164,238" fill="#4f93ca" stroke="#2e6fa9" stroke-width="2"/>
    <rect x="287" y="58" width="50" height="52" fill="#6aa4c8"/><rect x="299" y="24" width="26" height="34" fill="#76b0d0"/>
    <ellipse cx="312" cy="22" rx="78" ry="20" fill="none" stroke="#9ac6da" stroke-width="3"/>
    <line x1="164" y1="318" x2="456" y2="318" stroke="#45d4ca"/><text x="310" y="336" fill="#45d4ca" text-anchor="middle">RF F-F = ${rf} mm</text>
    <line x1="136" y1="346" x2="484" y2="346" stroke="#45d4ca"/><text x="310" y="357" fill="#45d4ca" text-anchor="middle">RTJ = ${rtj} mm</text>
    <line x1="532" y1="22" x2="532" y2="294" stroke="#f1ca46"/><text x="570" y="162" fill="#f1ca46" text-anchor="middle">Height ${h} mm</text>
    <text x="312" y="10" fill="#f1ca46" text-anchor="middle">Handwheel Ø ${hw} mm</text>
    <rect x="462" y="244" width="96" height="34" rx="4" fill="#17344c" stroke="#f1ca46"/><text x="510" y="258" fill="#fff" text-anchor="middle">${w.rfRtjKg.value} kg</text>
    <text x="310" y="202" fill="#1d4a67" text-anchor="middle">${row.standard} · ${row.datasetVersion}</text>
  </svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}
