const DATA_ROOT = '..';
const CATEGORIES = ['Valves', 'Pipe', 'Fittings', 'Flanges', 'Supports', 'Gaskets', 'Olets', 'Reducers', 'Coverage', 'Export'];
const CATEGORY_COMPONENTS = {
  Valves: 'VALVE', Pipe: 'PIPE', Fittings: 'FITTING', Flanges: 'FLANGE', Supports: 'SUPPORT',
  Gaskets: 'GASKET', Olets: 'OLET', Reducers: 'REDUCER', Coverage: 'COVERAGE', Export: 'EXPORT',
};
const DEFAULT_FILTERS = { componentType: 'VALVE', valveType: 'GATE', nps: '8', classRating: '150', facing: 'RF' };
const LABELS = {
  faceToFaceRfMm: 'RF Face-to-face', faceToFaceRtjMm: 'RTJ Face-to-face', buttWeldLengthMm: 'BW Length',
  heightMm: 'Valve Height', handwheelDiaMm: 'Handwheel Dia', rtjAddLengthMm: 'RTJ Add Length', gapMm: 'Gap',
  rfRtjKg: 'RF/RTJ Weight', buttWeldKg: 'BW Weight',
};

let state = {
  activeCategory: 'Valves', query: 'gate valve 8 class 150 rf', filters: DEFAULT_FILTERS,
  index: null, aliases: null, catalogs: new Map(), search: null, selectedEntry: null, row: null, auditOpen: false,
};

start().catch((error) => {
  document.body.innerHTML = `<main class="pane"><div class="pane-body">Component Studio failed to load: ${escapeHtml(error.message)}</div></main>`;
});

async function start() {
  paintTabs();
  const [searchIndex, aliases] = await Promise.all([
    loadJson('data/indexes/component-search.index.json'),
    loadJson('data/search/component-aliases.json'),
  ]);
  state.index = searchIndex;
  state.aliases = aliases;
  bindEvents();
  syncControls();
  await runSearch();
}

function bindEvents() {
  document.getElementById('search-button').addEventListener('click', () => runSearch(readControls()));
  document.getElementById('query-box').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runSearch(readControls());
  });
  document.getElementById('audit-box').addEventListener('toggle', (event) => {
    state.auditOpen = event.currentTarget.open;
    renderAudit();
  });
}

async function runSearch(next = {}) {
  state = { ...state, ...next };
  const search = componentSearch(state.query, state.index, { aliases: state.aliases, filters: state.filters });
  state.search = search;
  state.selectedEntry = search.results[0]?.entry ?? null;
  state.row = state.selectedEntry ? await loadCatalogRow(state.selectedEntry) : null;
  renderAll();
}

function renderAll() {
  paintTabs();
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

async function loadCatalogRow(entry) {
  if (!state.catalogs.has(entry.source)) state.catalogs.set(entry.source, await loadJson(entry.source));
  return state.catalogs.get(entry.source).rows?.find((row) => row.id === entry.id) ?? null;
}

function paintTabs() {
  const host = document.getElementById('category-tabs');
  host.innerHTML = CATEGORIES.map((cat) => `<button data-category="${cat}" class="${cat === state.activeCategory ? 'active' : ''}">${cat}</button>`).join('');
  for (const button of host.querySelectorAll('button')) {
    button.addEventListener('click', () => selectCategory(button.dataset.category));
  }
}

function selectCategory(category) {
  const componentType = CATEGORY_COMPONENTS[category] ?? 'VALVE';
  const filters = componentType === 'VALVE' ? DEFAULT_FILTERS : { componentType };
  state = { ...state, activeCategory: category, query: '', filters, auditOpen: false };
  syncControls();
  runSearch(readControls());
}

function syncControls() {
  document.getElementById('query-box').value = state.query;
  setValue('component-filter', state.filters.componentType ?? '');
  setValue('subtype-filter', state.filters.valveType ?? state.filters.subtype ?? '');
  setValue('nps-filter', state.filters.nps ?? '');
  setValue('class-filter', state.filters.classRating ?? '');
  setValue('schedule-filter', state.filters.schedule ?? '');
  setValue('facing-filter', state.filters.facing ?? '');
}

function readControls() {
  const componentType = getValue('component-filter');
  const subtype = getValue('subtype-filter');
  const filters = { componentType };
  if (subtype && componentType === 'VALVE') filters.valveType = subtype;
  else if (subtype) filters.subtype = subtype;
  if (getValue('nps-filter')) filters.nps = getValue('nps-filter');
  if (getValue('class-filter') && ['VALVE', 'FLANGE', 'GASKET'].includes(componentType)) filters.classRating = getValue('class-filter');
  if (getValue('schedule-filter') && ['PIPE', 'FITTING'].includes(componentType)) filters.schedule = getValue('schedule-filter');
  if (getValue('facing-filter') && componentType === 'VALVE') filters.facing = getValue('facing-filter');
  return { query: getValue('query-box'), filters, activeCategory: categoryFromComponent(componentType) };
}

function renderQuickFilters() {
  const filters = ['GATE VALVE 8 150 RF', 'PIPE 4 SCH40', 'WELD NECK FLANGE 4 300', 'RTJ GASKET 4 300', 'PIPE SHOE'];
  document.getElementById('quick-filters').innerHTML = filters.map((item) => `<button data-query="${escapeHtml(item)}">${item}</button>`).join('');
  for (const button of document.querySelectorAll('#quick-filters button')) {
    button.addEventListener('click', () => {
      document.getElementById('query-box').value = button.dataset.query;
      runSearch({ ...readControls(), query: button.dataset.query });
    });
  }
}

function renderResult() {
  const host = document.getElementById('result-card');
  if (!state.row) {
    host.className = 'result-card warn-card';
    host.innerHTML = `<strong>No exact match</strong><br><span>${escapeHtml(state.index.noFallbackPolicy)}</span>`;
    document.getElementById('source-line').innerHTML = 'No source-backed normalized row selected.';
    return;
  }
  host.className = 'result-card';
  host.innerHTML = `<strong>✓ Exact match</strong><br><span>${escapeHtml(state.selectedEntry.description)}</span><br><small>${escapeHtml(state.index.noFallbackPolicy)}</small>`;
  document.getElementById('source-line').innerHTML = `Dataset: <code>${escapeHtml(state.row.datasetVersion)}</code> · Status: ${escapeHtml(state.row.dataStatus)} · Token: ${escapeHtml(sourceToken(state.row))}`;
}

function renderIdentity() {
  const cells = state.row ? identityCells(state.row) : [['Selection', 'No exact match'], ['Fallback', 'Blocked']];
  document.getElementById('identity-grid').innerHTML = cells.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
}

function renderAttributes() {
  const attrs = state.row ? [...taggedRows(state.row.dimensions), ...taggedRows(state.row.weights)] : [];
  document.getElementById('attribute-body').innerHTML = attrs.length
    ? attrs.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(formatValue(item))}</td><td>${escapeHtml(item.basis)}</td><td>${escapeHtml(item.sourceColumn ?? '-')}</td></tr>`).join('')
    : '<tr><td colspan="4">No normalized row loaded. Exact match is required before dimensions are shown.</td></tr>';
}

function renderPreview() {
  document.getElementById('view-buttons').innerHTML = ['Orbit', 'Pan', 'Zoom', 'Top', 'Side', 'Iso'].map((item) => `<button class="${item === 'Iso' ? 'active' : ''}">${item}</button>`).join('');
  document.getElementById('cad-toggles').innerHTML = ['Dimensions', 'Leaders', 'Source Tags', 'Provenance'].map((item) => `<label><input type="checkbox" checked /> ${item}</label>`).join('');
  document.getElementById('cad-canvas').innerHTML = state.row ? previewSvg(state.row) : emptySvg('No exact component selected');
}

function renderVerification() {
  const chips = [
    ['Exact match', Boolean(state.row)], ['No fallback used', true], ['No fabricated dimensions', true],
    ['Provenance complete', Boolean(state.row?.datasetVersion)], [`Status ${state.row?.dataStatus ?? 'NONE'}`, Boolean(state.row?.dataStatus)],
  ];
  document.getElementById('verification-footer').innerHTML = chips.map(([label, ok]) => `<span class="${ok ? 'ok' : 'warn'}">${ok ? '✓' : '!'} ${escapeHtml(label)}</span>`).join('');
}

function renderAudit() {
  const host = document.getElementById('source-audit');
  if (!state.auditOpen || !state.row) {
    host.textContent = 'Open Source Audit only when raw provenance is needed.';
    return;
  }
  host.textContent = JSON.stringify({
    id: state.row.id, source: state.row.source, sourceToken: sourceToken(state.row), sourceRowNumber: state.row.sourceRowNumber,
    datasetVersion: state.row.datasetVersion, dataStatus: state.row.dataStatus, provenance: state.row.provenance,
  }, null, 2);
}

function componentSearch(query, index, options = {}) {
  const entries = Array.isArray(index?.entries) ? index.entries : [];
  const filters = cleanFilters(options.filters ?? {});
  const queryForms = exactQueryForms(query, options.aliases);
  const results = entries.filter((entry) => matchesFilters(entry, filters)).map((entry) => {
    const aliasMatched = queryForms.some((form) => entryExactForms(entry, options.aliases).has(form));
    const filterMatched = hasCompleteFilterMatch(entry, filters);
    return aliasMatched || filterMatched ? { id: entry.id, score: (aliasMatched ? 100 : 0) + (filterMatched ? 50 : 0), entry } : null;
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { ok: results.length > 0, results, diagnostics: results.length ? [] : [{ code: 'SEARCH_NO_EXACT_MATCH' }] };
}

function matchesFilters(entry, filters) {
  return Object.entries(cleanFilters(filters)).every(([key, expected]) => normalizeSearchText(entry.filters?.[key] ?? entry[key]) === normalizeSearchText(expected));
}
function hasCompleteFilterMatch(entry, filters) {
  return Object.keys(entry.filters ?? {}).every((key) => filters[key] !== undefined && matchesFilters(entry, { [key]: filters[key] }));
}
function exactQueryForms(query, aliases) { return exactForms([query], aliases); }
function entryExactForms(entry, aliases) { return new Set(exactForms([entry.id, entry.description, ...(entry.aliases ?? [])], aliases)); }
function exactForms(values, aliases) {
  const forms = new Set();
  for (const value of values) {
    const conventional = engineeringText(value);
    if (conventional) forms.add(conventional);
    const aliased = aliasText(conventional, aliasList(aliases));
    if (aliased) forms.add(aliased);
  }
  return [...forms];
}
function engineeringText(value) {
  return normalizeSearchText(value).replace(/\bCLASS\s*([0-9]+)\b/g, '$1').replace(/\bCL\s*([0-9]+)\b/g, '$1')
    .replace(/\bNPS\s*([0-9.]+)\b/g, '$1').replace(/\bSCHEDULE\s*([0-9A-Z]+)\b/g, 'SCH$1')
    .replace(/\bSCH\s+([0-9A-Z]+)\b/g, 'SCH$1').replace(/\s+/g, ' ').trim();
}
function aliasText(value, aliases) {
  let text = ` ${value} `;
  const replacements = aliases.flatMap((row) => [row.canonical, ...(row.aliases ?? [])].map((item) => [engineeringText(item), engineeringText(row.canonical)]));
  replacements.sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of replacements) if (from) text = text.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, 'g'), to);
  return normalizeSearchText(text);
}

function taggedRows(group = {}) { return Object.entries(group).map(([key, item]) => ({ key, label: LABELS[key] ?? labelize(key), value: item?.value ?? null, unit: item?.unit, basis: item?.basis ?? 'UNAVAILABLE', sourceColumn: item?.sourceColumn })); }
function identityCells(row) { return [['Type', row.componentType], ['Subtype', row.valveType ?? row.subtype ?? row.endType], ['NPS', row.nps], ['Class/Schedule', row.classRating ?? row.schedule], ['Status', row.dataStatus]].filter(([, value]) => value !== undefined && value !== null); }
function previewSvg(row) { return row.componentType === 'VALVE' ? valveSvg(row) : emptySvg(`${row.componentType} preview: dimensions available in table`); }
function valveSvg(row) {
  const d = row.dimensions ?? {}; const w = row.weights ?? {};
  const rf = valueText(d.faceToFaceRfMm); const rtj = valueText(d.faceToFaceRtjMm); const h = valueText(d.heightMm); const hw = valueText(d.handwheelDiaMm); const kg = valueText(w.rfRtjKg);
  return `<svg viewBox="0 0 620 360" xmlns="http://www.w3.org/2000/svg"><rect width="620" height="360" fill="#081521"/><line x1="30" y1="202" x2="590" y2="202" stroke="#244962" stroke-dasharray="9 6"/><rect x="30" y="166" width="128" height="72" fill="#3b82b6"/><rect x="462" y="166" width="128" height="72" fill="#3b82b6"/><polygon points="164,166 210,110 410,110 456,166 456,238 410,294 210,294 164,238" fill="#4f93ca" stroke="#2e6fa9" stroke-width="2"/><rect x="287" y="58" width="50" height="52" fill="#6aa4c8"/><ellipse cx="312" cy="22" rx="78" ry="20" fill="none" stroke="#9ac6da" stroke-width="3"/><line x1="164" y1="318" x2="456" y2="318" stroke="#45d4ca"/><text x="310" y="336" fill="#45d4ca" text-anchor="middle">RF F-F = ${escapeHtml(rf)}</text><line x1="136" y1="346" x2="484" y2="346" stroke="#45d4ca"/><text x="310" y="357" fill="#45d4ca" text-anchor="middle">RTJ = ${escapeHtml(rtj)}</text><line x1="532" y1="22" x2="532" y2="294" stroke="#f1ca46"/><text x="570" y="162" fill="#f1ca46" text-anchor="middle">Height ${escapeHtml(h)}</text><text x="312" y="10" fill="#f1ca46" text-anchor="middle">Handwheel Ø ${escapeHtml(hw)}</text><rect x="462" y="244" width="96" height="34" rx="4" fill="#17344c" stroke="#f1ca46"/><text x="510" y="265" fill="#fff" text-anchor="middle">${escapeHtml(kg)}</text><text x="310" y="202" fill="#1d4a67" text-anchor="middle">${escapeHtml(row.standard ?? '')} · ${escapeHtml(row.datasetVersion ?? '')}</text></svg>`;
}
function emptySvg(message) { return `<svg viewBox="0 0 620 360" xmlns="http://www.w3.org/2000/svg"><rect width="620" height="360" fill="#081521"/><text x="310" y="180" fill="#9ac6da" text-anchor="middle">${escapeHtml(message)}</text></svg>`; }
function formatValue(item) { return item.value === null || item.value === undefined ? 'Unavailable' : `${item.value}${item.unit ? ` ${item.unit}` : ''}`; }
function valueText(item) { return item?.value === null || item?.value === undefined ? 'Unavailable' : `${item.value}${item.unit ? ` ${item.unit}` : ''}`; }
function sourceToken(row) { return String(row.source ?? '').split('/').pop()?.replace(/\.csv$/i, '') ?? 'SOURCE'; }
function setValue(id, value) { const node = document.getElementById(id); if (node) node.value = value; }
function getValue(id) { return document.getElementById(id)?.value?.trim() ?? ''; }
function categoryFromComponent(type) { return Object.entries(CATEGORY_COMPONENTS).find(([, value]) => value === type)?.[0] ?? 'Valves'; }
function cleanFilters(filters) { return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')); }
function aliasList(aliasRows) { return Array.isArray(aliasRows) ? aliasRows : (aliasRows?.rows ?? []); }
function normalizeSearchText(value) { return String(value ?? '').toUpperCase().replace(/[”″]/g, '"').replace(/[^A-Z0-9+".]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function labelize(key) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
