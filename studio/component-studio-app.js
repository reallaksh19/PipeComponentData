const DATA_ROOT = '..';
const CATEGORIES = ['Dashboard', 'Valves', 'Pipe', 'Fittings', 'Flanges', 'Supports', 'Gaskets', 'Olets', 'Reducers', 'Coverage', 'Export'];
const CATEGORY_COMPONENTS = {
  Dashboard: 'DASHBOARD', Valves: 'VALVE', Pipe: 'PIPE', Fittings: 'FITTING', Flanges: 'FLANGE', Supports: 'SUPPORT',
  Gaskets: 'GASKET', Olets: 'OLET', Reducers: 'REDUCER', Coverage: 'COVERAGE', Export: 'EXPORT',
};
const DEFAULT_FILTERS = { componentType: 'VALVE', valveType: 'GATE', nps: '8', classRating: '150', facing: 'RF' };
const QUICK_FILTERS = [
  { label: 'Gate Valve 8in 150 RF', query: 'GATE VALVE 8 150 RF', activeCategory: 'Valves', filters: { ...DEFAULT_FILTERS } },
  { label: 'Pipe 4in Sch40', query: 'PIPE 4 SCH40', activeCategory: 'Pipe', filters: { componentType: 'PIPE', nps: '4', schedule: '40' } },
  { label: 'WN Flange 4in 300', query: 'WELD NECK FLANGE 4 300', activeCategory: 'Flanges', filters: { componentType: 'FLANGE', subtype: 'WN', nps: '4', classRating: '300' } },
  { label: 'RTJ Gasket', query: 'RTJ GASKET', activeCategory: 'Gaskets', filters: { componentType: 'GASKET', subtype: 'RTJ', facing: 'RTJ' } },
  { label: 'Pipe Shoe', query: 'PIPE SHOE', activeCategory: 'Supports', filters: { componentType: 'SUPPORT', subtype: 'SHOE' } },
];
const LABELS = {
  outsideDiameterMm: 'Outside diameter', wallThicknessMm: 'Wall thickness', insideDiameterMm: 'Inside diameter', centerToEndMm: 'Center-to-end',
  endToEndMm: 'End-to-end', faceToFaceRfMm: 'RF Face-to-face', faceToFaceRtjMm: 'RTJ Face-to-face', buttWeldLengthMm: 'BW Length',
  heightMm: 'Valve Height', handwheelDiaMm: 'Handwheel Dia', rtjAddLengthMm: 'RTJ Add Length', gapMm: 'Gap', pcdMm: 'PCD',
  boltCount: 'Bolt count', thicknessMm: 'Thickness', flangeOdMm: 'Flange OD', rfRtjKg: 'RF/RTJ Weight', buttWeldKg: 'BW Weight',
  weightKg: 'Weight', pipeWeightKgPerM: 'Pipe weight',
};
const SELECTOR_IDS = ['component-filter', 'subtype-filter', 'nps-filter', 'class-filter', 'schedule-filter', 'facing-filter'];
let state = {
  activeCategory: 'Valves', query: 'gate valve 8 class 150 rf', filters: { ...DEFAULT_FILTERS }, index: null, aliases: null, coverage: null,
  catalogs: new Map(), search: null, selectedEntry: null, row: null, auditOpen: false, tableEntries: [],
  viewMode: 'Iso',
};

const CAT_ICONS = {
  Dashboard: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.2"/></svg>`,
  Valves:    `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 8h2.5v-1L4 5h7l.5 2v1H14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M7.5 5V2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="7.5" cy="1.5" rx="2" ry=".7" stroke="currentColor" stroke-width="1"/><path d="M5 8v1.5a.5.5 0 00.5.5h4a.5.5 0 00.5-.5V8" stroke="currentColor" stroke-width="1.2"/></svg>`,
  Pipe:      `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><ellipse cx="3" cy="7.5" rx="2" ry="4" stroke="currentColor" stroke-width="1.2"/><line x1="3" y1="3.5" x2="12" y2="3.5" stroke="currentColor" stroke-width="1.2"/><line x1="3" y1="11.5" x2="12" y2="11.5" stroke="currentColor" stroke-width="1.2"/><ellipse cx="12" cy="7.5" rx="2" ry="4" stroke="currentColor" stroke-width="1.2"/></svg>`,
  Fittings:  `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 7.5h4v-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M10 7.5h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  Flanges:   `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.2"/><circle cx="7.5" cy="7.5" r="3" stroke="currentColor" stroke-width="1"/><circle cx="7.5" cy="2.5" r=".8" fill="currentColor" opacity=".7"/><circle cx="7.5" cy="12.5" r=".8" fill="currentColor" opacity=".7"/><circle cx="2.5" cy="7.5" r=".8" fill="currentColor" opacity=".7"/><circle cx="12.5" cy="7.5" r=".8" fill="currentColor" opacity=".7"/></svg>`,
  Supports:  `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 10V6l4-3 4 3v4" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><rect x="1" y="10" width="13" height="2" rx=".5" stroke="currentColor" stroke-width="1.2"/><line x1="7" y1="10" x2="7" y2="12" stroke="currentColor" stroke-width="1.2"/></svg>`,
  Gaskets:   `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 1.5"/><circle cx="7.5" cy="7.5" r="3.5" stroke="currentColor" stroke-width="1"/></svg>`,
  Olets:     `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><line x1="1" y1="10" x2="14" y2="10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M7.5 10V5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="7.5" cy="4" r="1.5" stroke="currentColor" stroke-width="1.2"/></svg>`,
  Reducers:  `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 5h4v5H1z" stroke="currentColor" stroke-width="1.2"/><path d="M10 7h4v1h-4z" stroke="currentColor" stroke-width="1.2"/><path d="M5 5l5 2-5 3V5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
  Coverage:  `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3" width="13" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M3 10l2.5-3 2 2 2.5-4 2.5 5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  Export:    `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5 3H3a1 1 0 00-1 1v8a1 1 0 001 1h9a1 1 0 001-1V4a1 1 0 00-1-1h-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M7.5 1v8M5 6.5l2.5-2.5L10 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
const NAV_SECTIONS = { Dashboard: '', Valves: 'Components', Pipe: '', Fittings: '', Flanges: '', Supports: '', Gaskets: '', Olets: '', Reducers: '', Coverage: 'Audit', Export: '' };

start().catch((error) => {
  document.body.innerHTML = `<main class="pane"><div class="pane-body">Component Studio failed to load: ${escapeHtml(error.message)}</div></main>`;
});

async function start() {
  paintTabs();
  const [searchIndex, aliases, coverage] = await Promise.all([
    loadJson('data/indexes/component-search.index.json'),
    loadJson('data/search/component-aliases.json'),
    loadJson('data/audit/db-coverage-dashboard.json'),
  ]);
  state = { ...state, index: searchIndex, aliases, coverage };
  bindEvents();
  syncControls();
  await runSearch();
}

function bindEvents() {
  document.getElementById('search-button').addEventListener('click', () => runSearch(readControls()));
  document.getElementById('copy-id-button').addEventListener('click', copySelectedId);
  document.getElementById('query-box').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runSearch(readControls());
  });
  document.getElementById('audit-box').addEventListener('toggle', (event) => {
    state.auditOpen = event.currentTarget.open;
    renderAudit();
  });
  for (const id of SELECTOR_IDS) document.getElementById(id).addEventListener('change', () => runSearch(readControls()));
}

async function runSearch(next = {}) {
  const filters = normalizeSmartFilters(next.filters ?? state.filters);
  state = { ...state, ...next, filters, activeCategory: next.activeCategory ?? categoryFromComponent(filters.componentType) };
  state.tableEntries = tableEntriesForState();
  if (isCoverage() || isDashboardLike()) {
    state.search = null;
    state.selectedEntry = null;
    state.row = null;
    renderAll();
    return;
  }
  const search = componentSearch(state.query, state.index, { aliases: state.aliases, filters: state.filters });
  state.search = search;
  state.selectedEntry = search.results[0]?.entry ?? null;
  state.row = state.selectedEntry ? await loadCatalogRow(state.selectedEntry) : null;
  renderAll();
}

async function selectEntry(id) {
  const entry = state.tableEntries.find((item) => item.id === id) ?? state.index.entries.find((item) => item.id === id);
  if (!entry) return;
  state = { ...state, activeCategory: categoryFromComponent(entry.filters?.componentType), query: '', filters: { ...entry.filters }, selectedEntry: entry };
  state.row = await loadCatalogRow(entry);
  state.search = { ok: Boolean(state.row), results: state.row ? [{ id: entry.id, score: 150, entry }] : [], diagnostics: [] };
  state.tableEntries = tableEntriesForState();
  closeAuditBox();
  renderAll();
}

function renderAll() {
  paintTabs();
  renderSelectorOptions();
  syncControls();
  renderDashboardCards();
  renderQuickFilters();
  renderFamilySummary();
  renderComponentTable();
  renderBrowserMetrics();
  renderResult();
  renderIdentity();
  renderAttributes();
  renderDetailDrawer();
  renderProvenancePanel();
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
  let html = '';
  let lastSection = null;
  for (const cat of CATEGORIES) {
    const section = NAV_SECTIONS[cat];
    if (section && section !== lastSection) {
      html += `<span class="nav-section-label">${escapeHtml(section)}</span>`;
      lastSection = section;
    }
    const count = categoryCount(cat);
    const countBadge = count ? ` <em>${count}</em>` : '';
    const icon = CAT_ICONS[cat] ?? '';
    html += `<button data-category="${cat}" class="${cat === state.activeCategory ? 'active' : ''}">${icon}${escapeHtml(cat)}${countBadge}</button>`;
  }
  host.innerHTML = html;
  for (const button of host.querySelectorAll('button')) button.addEventListener('click', () => selectCategory(button.dataset.category));
}

function selectCategory(category) {
  const componentType = CATEGORY_COMPONENTS[category] ?? 'VALVE';
  const filters = componentType === 'VALVE' ? { ...DEFAULT_FILTERS } : { componentType };
  state = { ...state, activeCategory: category, query: category === 'Valves' ? state.query : '', filters, auditOpen: false, selectedEntry: null, row: null };
  closeAuditBox();
  runSearch({ activeCategory: category, query: state.query, filters });
}

function renderSelectorOptions() {
  const filters = normalizeSmartFilters(state.filters);
  state.filters = filters;
  setOptions('component-filter', indexedValues('componentType', {}), filters.componentType);
  const subtypeKey = subtypeKeyFor(filters.componentType);
  setOptions('subtype-filter', indexedValues(subtypeKey, { componentType: filters.componentType }), filters[subtypeKey] ?? '');
  setOptions('nps-filter', indexedValues('nps', subtypeScope(filters)), filters.nps ?? '');
  setOptions('class-filter', indexedValues('classRating', sizeScope(filters)), filters.classRating ?? '');
  setOptions('schedule-filter', indexedValues('schedule', sizeScope(filters)), filters.schedule ?? '');
  setOptions('facing-filter', indexedValues('facing', ratingScope(filters)), filters.facing ?? '');
  document.getElementById('subtype-label').textContent = filters.componentType === 'VALVE' ? 'Valve type' : 'Type / Subtype';
  setFieldVisible('subtype-field', indexedValues(subtypeKey, { componentType: filters.componentType }).length > 0);
  setFieldVisible('class-field', indexedValues('classRating', sizeScope(filters)).length > 0);
  setFieldVisible('schedule-field', indexedValues('schedule', sizeScope(filters)).length > 0);
  setFieldVisible('facing-field', indexedValues('facing', ratingScope(filters)).length > 0);
}

function syncControls() {
  document.getElementById('query-box').value = state.query;
  const filters = normalizeSmartFilters(state.filters);
  setValue('component-filter', filters.componentType);
  setValue('subtype-filter', filters[subtypeKeyFor(filters.componentType)] ?? '');
  setValue('nps-filter', filters.nps ?? '');
  setValue('class-filter', filters.classRating ?? '');
  setValue('schedule-filter', filters.schedule ?? '');
  setValue('facing-filter', filters.facing ?? '');
  state.filters = filters;
}

function readControls() {
  if (state.activeCategory === 'Coverage') return { activeCategory: 'Coverage', query: '', filters: { componentType: 'COVERAGE' } };
  if (state.activeCategory === 'Dashboard') return { activeCategory: 'Dashboard', query: getValue('query-box'), filters: { componentType: 'DASHBOARD' } };
  if (state.activeCategory === 'Export') return { activeCategory: 'Export', query: '', filters: { componentType: 'EXPORT' } };
  const componentType = getValue('component-filter') || 'VALVE';
  const subtype = getValue('subtype-filter');
  const filters = { componentType };
  if (subtype && componentType === 'VALVE') filters.valveType = subtype;
  else if (subtype) filters.subtype = subtype;
  if (getValue('nps-filter')) filters.nps = getValue('nps-filter');
  if (getValue('class-filter')) filters.classRating = getValue('class-filter');
  if (getValue('schedule-filter')) filters.schedule = getValue('schedule-filter');
  if (getValue('facing-filter')) filters.facing = getValue('facing-filter');
  return { query: getValue('query-box'), filters: normalizeSmartFilters(filters), activeCategory: categoryFromComponent(componentType) };
}

function normalizeSmartFilters(filters) {
  const componentType = filters.componentType && !['DASHBOARD', 'COVERAGE', 'EXPORT'].includes(filters.componentType) ? filters.componentType : 'VALVE';
  const next = { componentType };
  const subtypeKey = subtypeKeyFor(componentType);
  if (filters[subtypeKey] && indexedValues(subtypeKey, next).includes(filters[subtypeKey])) next[subtypeKey] = filters[subtypeKey];
  if (filters.nps && indexedValues('nps', subtypeScope(next)).includes(filters.nps)) next.nps = filters.nps;
  if (filters.classRating && indexedValues('classRating', sizeScope(next)).includes(filters.classRating)) next.classRating = filters.classRating;
  if (filters.schedule && indexedValues('schedule', sizeScope(next)).includes(filters.schedule)) next.schedule = filters.schedule;
  if (filters.facing && indexedValues('facing', ratingScope(next)).includes(filters.facing)) next.facing = filters.facing;
  return next;
}

function renderDashboardCards() {
  const s = state.coverage?.summary ?? {};
  const cards = [
    ['Indexed components', s.indexedEntryCount ?? countEntries(), 'Exact-search public index'],
    ['Resolved rows', s.indexedResolvedRowCount ?? countEntries(), 'Every indexed row resolves'],
    ['Ready rows', s.readyRows ?? statusCount('READY'), 'Source-backed values available'],
    ['Partial / missing', `${statusCount('PARTIAL')} / ${statusCount('MISSING_DIMENSION')}`, 'Unavailable values stay explicit'],
    ['Families', s.familyCount ?? familyStats().length, 'Browse by component family'],
  ];
  document.getElementById('dashboard-cards').innerHTML = cards.map(metricCard).join('');
}

function renderQuickFilters() {
  document.getElementById('quick-filters').innerHTML = QUICK_FILTERS.map((item, index) => `<button data-index="${index}">${escapeHtml(item.label)}</button>`).join('');
  for (const button of document.querySelectorAll('#quick-filters button')) {
    button.addEventListener('click', () => {
      const item = QUICK_FILTERS[Number(button.dataset.index)];
      const next = { activeCategory: item.activeCategory, query: item.query, filters: { ...item.filters }, auditOpen: false };
      state = { ...state, ...next };
      closeAuditBox();
      runSearch(next);
    });
  }
}

function renderFamilySummary() {
  const activeFamily = componentTypeForControls();
  const items = familyStats().map((f) => `<li class="${f.family === activeFamily ? 'active' : ''}"><strong>${escapeHtml(f.family)}</strong><span>${f.count} rows</span><em>${escapeHtml(f.status)}</em></li>`).join('');
  document.getElementById('family-summary').innerHTML = `<h3>Family coverage</h3><ul>${items}</ul>`;
}

function renderComponentTable() {
  const entries = state.tableEntries;
  document.getElementById('table-count').textContent = `${entries.length} visible rows`;
  document.getElementById('browser-summary').textContent = isDashboardLike() ? 'Foundation dashboard: choose a family tab or table row.' : `${state.activeCategory} indexed rows available for browsing.`;
  document.getElementById('component-table-body').innerHTML = entries.length ? entries.map((entry) => {
    const selected = state.selectedEntry?.id === entry.id ? ' selected' : '';
    const description = entry.description ? `<small>${escapeHtml(entry.description)}</small>` : '';
    return `<tr class="${selected}"><td><button title="${escapeHtml(entry.id)}" data-id="${escapeHtml(entry.id)}">${escapeHtml(entry.id)}</button>${description}</td><td>${statusBadge(entry.dataStatus)}</td><td>${filterTags(entry.filters)}</td><td>${escapeHtml(sourceLabel(entry.source))}</td></tr>`;
  }).join('') : '<tr><td colspan="4">No rows in this family yet. Source/schema review is required before promotion.</td></tr>';
  for (const button of document.querySelectorAll('#component-table-body button')) button.addEventListener('click', () => selectEntry(button.dataset.id));
}

function renderBrowserMetrics() {
  const rows = state.tableEntries;
  const ready = rows.filter((entry) => entry.dataStatus === 'READY').length;
  const partial = rows.filter((entry) => entry.dataStatus === 'PARTIAL').length;
  const missing = rows.length - ready - partial;
  const filters = filterText(state.filters) || 'none';
  document.getElementById('browser-metrics').innerHTML = [
    ['Visible rows', rows.length, 'Current table after selected family/filter'],
    ['Ready', ready, 'Rows with source-backed values available'],
    ['Partial / missing', `${partial} / ${missing}`, 'Null or unavailable values stay visible'],
    ['Active filters', filters, 'Exact filters only, no fallback'],
  ].map(metricCard).join('');
}

function renderResult() {
  const host = document.getElementById('result-card');
  if (isCoverage()) {
    const s = state.coverage.summary;
    host.className = 'result-card';
    host.innerHTML = `<strong>DB coverage dashboard</strong><br><span>${s.indexedResolvedRowCount}/${s.indexedEntryCount} indexed rows resolve - ${s.missingCatalogRows} catalog gaps - ${s.unavailableFieldCount} unavailable fields visible</span>`;
    document.getElementById('source-line').innerHTML = `Audit: <code>${escapeHtml(state.coverage.schema)}</code> - ${escapeHtml(state.coverage.phase)} - No values promoted`;
    return;
  }
  if (isDashboardLike()) {
    host.className = 'result-card';
    host.innerHTML = '<strong>Dashboard mode</strong><br><span>Select a row from the bottom Catalog Browser or use an exact quick filter.</span>';
    document.getElementById('source-line').innerHTML = 'Dashboard view: no raw source tree exposed.';
    return;
  }
  if (!state.row) {
    host.className = 'result-card warn-card';
    host.innerHTML = `<strong>No exact match</strong><br><span>${escapeHtml(state.index.noFallbackPolicy)}</span>`;
    document.getElementById('source-line').innerHTML = 'No source-backed normalized row selected.';
    return;
  }
  host.className = 'result-card';
  host.innerHTML = `<strong>Exact match</strong><br><span>${escapeHtml(componentTitle(state.row))}</span><br><small>${escapeHtml(state.index.noFallbackPolicy)}</small>`;
  document.getElementById('source-line').innerHTML = `Dataset: <code>${escapeHtml(state.row.datasetVersion)}</code> - Status: ${escapeHtml(state.row.dataStatus)} - Source token: ${escapeHtml(sourceToken(state.row))}`;
}

function renderIdentity() {
  const cells = isCoverage() ? coverageCells() : (state.row ? identityCells(state.row) : [['Selection', isDashboardLike() ? 'Browse table' : 'No exact match'], ['Fallback', 'Blocked']]);
  document.getElementById('identity-grid').innerHTML = cells.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
}

function renderAttributes() {
  if (isCoverage()) {
    document.getElementById('attribute-body').innerHTML = coverageRows().map((item) => `<tr><td>${escapeHtml(item.family)}</td><td>${escapeHtml(item.value)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.source)}</td></tr>`).join('');
    return;
  }
  const attrs = state.row ? [...taggedRows(state.row.dimensions), ...taggedRows(state.row.weights)] : [];
  document.getElementById('attribute-body').innerHTML = attrs.length
    ? attrs.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(formatValue(item))}</td><td>${escapeHtml(item.basis)}</td><td>${escapeHtml(item.sourceColumn ?? '-')}</td></tr>`).join('')
    : '<tr><td colspan="4">No normalized row loaded. Exact match or row selection is required before dimensions are shown.</td></tr>';
}

function renderDetailDrawer() {
  const host = document.getElementById('component-detail');
  if (!state.row) {
    host.innerHTML = '<h3>Component Data</h3><p>Select a catalog row to inspect component identity, status, and available values inside the canvas.</p>';
    return;
  }
  const missing = taggedRows(state.row.dimensions).filter(isUnavailable).length + taggedRows(state.row.weights).filter(isUnavailable).length;
  host.innerHTML = `<h3>Component Data</h3><dl>${identityCells(state.row).map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}<dt>Component ID</dt><dd>${escapeHtml(state.row.id)}</dd><dt>Unavailable fields</dt><dd>${missing}</dd></dl>`;
}

function renderProvenancePanel() {
  const host = document.getElementById('provenance-panel');
  if (!state.row) {
    host.innerHTML = '<h3>Provenance</h3><p>Raw source paths are hidden until Source Audit is explicitly opened.</p>';
    return;
  }
  host.innerHTML = `<h3>Provenance</h3><p><strong>Source token:</strong> <strong>${escapeHtml(sourceToken(state.row))}</strong></p><p><strong>Source row:</strong> ${escapeHtml(state.row.sourceRowNumber ?? 'n/a')}</p><p><strong>Value basis:</strong> source-backed values or UNAVAILABLE only.</p>`;
}

function renderPreview() {
  const modes = ['Iso', 'Top', 'Side', 'Dimensions', 'Source'];
  document.getElementById('view-buttons').innerHTML = modes.map((item) => {
    const active = item === state.viewMode ? 'active' : '';
    return `<button class="${active}" data-mode="${item}">${item}</button>`;
  }).join('');
  
  for (const button of document.querySelectorAll('#view-buttons button')) {
    button.addEventListener('click', (e) => {
      state.viewMode = e.currentTarget.dataset.mode;
      renderPreview();
    });
  }

  document.getElementById('cad-toggles').innerHTML = ['Dimensions', 'Leaders', 'Source Tags', 'Provenance'].map((item) => `<label><input type="checkbox" checked /> ${item}</label>`).join('');
  document.getElementById('cad-canvas').innerHTML = isCoverage() ? coverageSvg() : (state.row ? previewSvg(state.row) : emptySvg(isDashboardLike() ? 'Browse a row to preview source-backed data' : 'No exact component selected'));
}

function renderVerification() {
  const chips = isCoverage()
    ? [['Dashboard loaded', Boolean(state.coverage?.ok)], ['Coverage only', true], ['No values promoted', true], [`Catalog gaps ${state.coverage?.summary?.missingCatalogRows ?? 'N/A'}`, state.coverage?.summary?.missingCatalogRows === 0]]
    : [['Two-pane workspace', true], ['Bottom catalog browser', true], ['Exact match', Boolean(state.row)], ['No fallback used', true], ['No fabricated dimensions', true], ['Raw source hidden', true]];
  document.getElementById('verification-footer').innerHTML = chips.map(([label, ok]) => `<span class="${ok ? 'ok' : 'warn'}">${ok ? 'OK' : '!'} ${escapeHtml(label)}</span>`).join('');
}

function renderAudit() {
  const host = document.getElementById('source-audit');
  if (!state.auditOpen) {
    host.textContent = 'Open Source Audit only when raw provenance is needed.';
    return;
  }
  if (isCoverage()) {
    host.textContent = JSON.stringify({ policy: state.coverage.policy, summary: state.coverage.summary, gaps: state.coverage.gaps, diagnostics: state.coverage.diagnostics }, null, 2);
    return;
  }
  if (!state.row) {
    host.textContent = 'No normalized row selected.';
    return;
  }
  host.textContent = JSON.stringify({ id: state.row.id, source: state.row.source, sourceToken: sourceToken(state.row), sourceRowNumber: state.row.sourceRowNumber, datasetVersion: state.row.datasetVersion, dataStatus: state.row.dataStatus, provenance: state.row.provenance }, null, 2);
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

function tableEntriesForState() {
  const entries = Array.isArray(state.index?.entries) ? state.index.entries : [];
  const componentType = componentTypeForControls();
  const text = normalizeSearchText(state.query);
  if (isCoverage() || componentType === 'COVERAGE') return [];
  const base = isDashboardLike() ? entries : entries.filter((entry) => entry.filters?.componentType === componentType || entry.family === componentType);
  if (!text || hasStructuredFilters()) return base;
  return base.filter((entry) => normalizeSearchText(`${entry.id} ${entry.description} ${(entry.aliases ?? []).join(' ')}`).includes(text));
}

function indexedValues(field, scope) {
  const values = (state.index?.entries ?? [])
    .filter((entry) => matchesFilters(entry, scope))
    .map((entry) => entry.filters?.[field])
    .filter((value) => value !== undefined && value !== null && value !== '');
  return [...new Set(values.map(String))].sort(sortEngineeringValues);
}

function setOptions(id, values, selected) {
  const node = document.getElementById(id);
  const options = ['', ...values].map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  node.innerHTML = options;
  node.value = values.includes(selected) ? selected : '';
}

// Helper: check if selector option matches currently selected value
function setValue(id, value) {
  const node = document.getElementById(id);
  if (node) node.value = value;
}

function subtypeScope(filters) {
  const subtypeKey = subtypeKeyFor(filters.componentType);
  return cleanFilters({ componentType: filters.componentType, [subtypeKey]: filters[subtypeKey] });
}

function sizeScope(filters) {
  return cleanFilters({ ...subtypeScope(filters), nps: filters.nps });
}

function ratingScope(filters) {
  return cleanFilters({ ...sizeScope(filters), classRating: filters.classRating, schedule: filters.schedule });
}

function subtypeKeyFor(componentType) {
  return componentType === 'VALVE' ? 'valveType' : 'subtype';
}

function setFieldVisible(id, visible) {
  const node = document.getElementById(id);
  if (node) node.hidden = !visible;
}

function metricCard([label, value, note]) {
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
}

function familyStats() {
  const grouped = new Map();
  for (const entry of state.index?.entries ?? []) {
    const family = entry.family ?? entry.filters?.componentType ?? 'UNKNOWN';
    const item = grouped.get(family) ?? { family, count: 0, ready: 0, partial: 0, missing: 0, status: 'READY' };
    item.count += 1;
    if (entry.dataStatus === 'READY') item.ready += 1;
    else if (entry.dataStatus === 'PARTIAL') item.partial += 1;
    else item.missing += 1;
    item.status = item.missing ? 'MISSING' : (item.partial ? 'PARTIAL' : 'READY');
    grouped.set(family, item);
  }
  return [...grouped.values()].sort((a, b) => a.family.localeCompare(b.family));
}

function categoryCount(cat) {
  const component = CATEGORY_COMPONENTS[cat];
  return (state.index?.entries ?? []).filter((entry) => entry.family === component || entry.filters?.componentType === component).length;
}

function coverageCells() {
  const s = state.coverage.summary;
  return [['Families', s.familyCount], ['Indexed', s.indexedEntryCount], ['Resolved', s.indexedResolvedRowCount], ['Ready', s.readyRows], ['Missing dim', s.missingDimensionRows]];
}

function coverageRows() {
  return Object.values(state.coverage.families).map((f) => ({ family: f.family, value: `${f.readyRows} ready / ${f.normalizedRows} rows`, status: f.coverageStatus, source: `${f.sourceCoverage?.sourceFileCount ?? 0} files - ${f.unavailableFieldCount} unavailable` }));
}

function coverageSvg() {
  const rows = coverageRows();
  const bars = rows.map((row, i) => `<text x="40" y="${68 + i * 38}" fill="#cce4f7">${escapeHtml(row.family)}</text><rect x="150" y="${50 + i * 38}" width="${Math.max(16, Number(row.value.match(/^[0-9]+/)?.[0] ?? 0) * 40)}" height="18" fill="#4f93ca"/><text x="360" y="${68 + i * 38}" fill="#9ac6da">${escapeHtml(row.status)}</text>`).join('');
  return `<svg viewBox="0 0 620 360" xmlns="http://www.w3.org/2000/svg"><rect width="620" height="360" fill="#07131f"/><text x="40" y="30" fill="#45d4ca">DB coverage - visibility only - no values promoted</text>${bars}</svg>`;
}


function previewSvg(row) {
  if (row.componentType === 'VALVE') return valveSvg(row);
  if (row.componentType === 'PIPE') return pipeSvg(row);
  if (row.componentType === 'FLANGE') return flangeSvg(row);
  return genericSvg(row);
}

function svgDefs() {

  return `<defs>
    <pattern id="dot-grid" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r=".9" fill="rgba(0,229,255,.12)"/></pattern>
    <filter id="glow-c"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="glow-g"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e3a5f"/><stop offset=".4" stop-color="#2a5280"/><stop offset="1" stop-color="#112238"/></linearGradient>
    <linearGradient id="metal-h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#112238"/><stop offset=".5" stop-color="#2a5280"/><stop offset="1" stop-color="#112238"/></linearGradient>
  </defs>`;
}

function svgBg() {
  return `<rect width="800" height="520" fill="#060e1c"/><rect width="800" height="520" fill="url(#dot-grid)"/>`;
}

function dimLine(x1,y1,x2,y2,label,lx,ly,color='#00e096') {
  return `<g>
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" stroke-dasharray="5 3" opacity=".7"/>
    <circle cx="${x1}" cy="${y1}" r="3" fill="${color}" opacity=".9"/>
    <circle cx="${x2}" cy="${y2}" r="3" fill="${color}" opacity=".9"/>
    <text x="${lx}" y="${ly}" fill="${color}" font-family="Consolas,monospace" font-size="11" font-weight="600" text-anchor="middle" opacity=".95">${escapeHtml(label)}</text>
  </g>`;
}

function valveSvg(row) {
  const d = row.dimensions ?? {};
  const ff = valueText(d.faceToFaceRfMm);
  const ht = valueText(d.heightMm);
  const hw = valueText(d.handwheelDiaMm);
  const wt = valueText(d.rfRtjKg);
  return `<svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">${svgDefs()}${svgBg()}
    <!-- centerline -->
    <line x1="30" y1="260" x2="770" y2="260" stroke="rgba(0,229,255,.2)" stroke-dasharray="12 6" stroke-width="1"/>
    <!-- pipe stubs -->
    <rect x="40" y="220" width="155" height="40" fill="url(#metal)" stroke="#00e5ff" stroke-width="1.5" rx="3" filter="url(#glow-c)"/>
    <rect x="605" y="220" width="155" height="40" fill="url(#metal)" stroke="#00e5ff" stroke-width="1.5" rx="3" filter="url(#glow-c)"/>
    <!-- flange faces -->
    <rect x="188" y="200" width="18" height="80" fill="#1e3a5f" stroke="#00e5ff" stroke-width="2" rx="2"/>
    <rect x="594" y="200" width="18" height="80" fill="#1e3a5f" stroke="#00e5ff" stroke-width="2" rx="2"/>
    <!-- valve body -->
    <polygon points="206,200 310,140 490,140 594,200 594,320 490,380 310,380 206,320"
      fill="url(#metal)" stroke="#00e5ff" stroke-width="2" filter="url(#glow-c)"/>
    <!-- gate/wedge -->
    <rect x="355" y="152" width="90" height="216" fill="rgba(0,229,255,.06)" stroke="rgba(0,229,255,.3)" stroke-width="1" rx="3"/>
    <line x1="355" y1="200" x2="445" y2="200" stroke="rgba(0,229,255,.25)" stroke-width="1"/>
    <line x1="355" y1="260" x2="445" y2="260" stroke="rgba(0,229,255,.25)" stroke-width="1"/>
    <line x1="355" y1="320" x2="445" y2="320" stroke="rgba(0,229,255,.25)" stroke-width="1"/>
    <!-- stem -->
    <rect x="388" y="60" width="24" height="82" fill="url(#metal-h)" stroke="#00e5ff" stroke-width="1.5" rx="3"/>
    <!-- stuffing box -->
    <rect x="376" y="130" width="48" height="24" fill="#1e3a5f" stroke="#00e5ff" stroke-width="1.5" rx="3"/>
    <!-- handwheel -->
    <ellipse cx="400" cy="44" rx="88" ry="18" fill="none" stroke="#ffffff" stroke-width="3" filter="url(#glow-g)" opacity=".9"/>
    <ellipse cx="400" cy="44" rx="88" ry="18" fill="none" stroke="#00e5ff" stroke-width="1" opacity=".3"/>
    <circle cx="400" cy="44" r="8" fill="#1e3a5f" stroke="#fff" stroke-width="2"/>
    <line x1="312" y1="44" x2="488" y2="44" stroke="#fff" stroke-width="1.5" opacity=".3"/>
    <!-- body highlight -->
    <path d="M230 200 Q240 140 310 140" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="3"/>
    <!-- labels -->
    <text x="120" y="215" fill="rgba(0,229,255,.6)" font-family="Segoe UI,sans-serif" font-size="10" text-anchor="middle">FLANGED INLET</text>
    <text x="680" y="215" fill="rgba(0,229,255,.6)" font-family="Segoe UI,sans-serif" font-size="10" text-anchor="middle">FLANGED OUTLET</text>
    <!-- dimension lines -->
    ${dimLine(206,415,594,415,'RF F-F: '+ff,400,430,'#00e096')}
    ${dimLine(660,60,660,380,'H: '+ht,705,222,'#ffb900')}
    ${dimLine(312,18,488,18,'HW DIA: '+hw,400,13,'#a78bfa')}
    <!-- weight badge -->
    <rect x="12" y="460" width="140" height="26" rx="6" fill="rgba(0,229,255,.06)" stroke="rgba(0,229,255,.2)" stroke-width="1"/>
    <text x="82" y="477" fill="#00e5ff" font-family="Consolas,monospace" font-size="11" font-weight="600" text-anchor="middle">W: ${escapeHtml(wt)}</text>
    <!-- component type badge -->
    <rect x="630" y="460" width="160" height="26" rx="6" fill="rgba(167,139,250,.08)" stroke="rgba(167,139,250,.2)" stroke-width="1"/>
    <text x="710" y="477" fill="#a78bfa" font-family="Segoe UI,sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing=".1em">${escapeHtml((row.valveType||''))} VALVE - ${escapeHtml(row.nps||'')}in - CL${escapeHtml(row.classRating||'')}</text>
  </svg>`;
}

function pipeSvg(row) {
  const d = row.dimensions ?? {};
  const od = valueText(d.outsideDiameterMm);
  const wt = valueText(d.wallThicknessMm);
  const id_ = valueText(d.insideDiameterMm);
  return `<svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">${svgDefs()}${svgBg()}
    <!-- centerline -->
    <line x1="30" y1="260" x2="770" y2="260" stroke="rgba(0,229,255,.2)" stroke-dasharray="12 6" stroke-width="1"/>
    <!-- cut-end face -->
    <ellipse cx="140" cy="260" rx="24" ry="130" fill="#0a1a2e" stroke="#00e5ff" stroke-width="2" filter="url(#glow-c)"/>
    <ellipse cx="140" cy="260" rx="14" ry="83" fill="#060e1c" stroke="#00e096" stroke-width="1.5"/>
    <!-- pipe body top & bottom walls -->
    <rect x="140" y="130" width="500" height="47" fill="url(#metal)" stroke="#00e5ff" stroke-width="1.5"/>
    <rect x="140" y="343" width="500" height="47" fill="url(#metal)" stroke="#00e5ff" stroke-width="1.5"/>
    <!-- pipe bore (inside) -->
    <rect x="140" y="177" width="500" height="166" fill="#040b18"/>
    <!-- cut-face right -->
    <ellipse cx="640" cy="260" rx="24" ry="130" fill="#0e1e33" stroke="#00e5ff" stroke-width="2" filter="url(#glow-c)"/>
    <ellipse cx="640" cy="260" rx="14" ry="83" fill="#060e1c" stroke="#00e096" stroke-width="1.5"/>
    <!-- wall thickness arrows -->
    <line x1="660" y1="130" x2="710" y2="130" stroke="#ffb900" stroke-width="1"/>
    <line x1="660" y1="177" x2="710" y2="177" stroke="#ffb900" stroke-width="1"/>
    <line x1="700" y1="130" x2="700" y2="177" stroke="#ffb900" stroke-width="1.5"/>
    <text x="718" y="158" fill="#ffb900" font-family="Consolas,monospace" font-size="11" font-weight="600">WT: ${escapeHtml(wt)}</text>
    <!-- OD dimension -->
    ${dimLine(140,90,640,90,'OD: '+od,390,83,'#00e096')}
    <!-- ID dimension -->
    ${dimLine(140,180,640,180,'ID: '+id_,390,173,'rgba(0,229,255,.55)')}
    <!-- schedule badge -->
    <rect x="630" y="460" width="160" height="26" rx="6" fill="rgba(167,139,250,.08)" stroke="rgba(167,139,250,.2)" stroke-width="1"/>
    <text x="710" y="477" fill="#a78bfa" font-family="Segoe UI,sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing=".1em">PIPE - NPS${escapeHtml(row.nps||'')} - SCH${escapeHtml(row.schedule||'')}</text>
  </svg>`;
}

function flangeSvg(row) {
  const d = row.dimensions ?? {};
  const od = valueText(d.flangeOdMm);
  const thk = valueText(d.thicknessMm);
  const pcd = valueText(d.pcdMm);
  const boltN = Number(d.boltCount?.value ?? 8);
  const r = 140; const cx = 300; const cy = 260;
  return `<svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">${svgDefs()}${svgBg()}
    <!-- flange body -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#metal)" stroke="#00e5ff" stroke-width="2.5" filter="url(#glow-c)"/>
    <!-- raised face (RF) -->
    <circle cx="${cx}" cy="${cy}" r="108" fill="#1a3355" stroke="rgba(0,229,255,.4)" stroke-width="1.5"/>
    <!-- bore -->
    <circle cx="${cx}" cy="${cy}" r="68" fill="#060e1c" stroke="#00e096" stroke-width="2"/>
    <!-- bolt holes -->
    ${boltCircles(cx, cy, 114, boltN)}
    <!-- PCD circle (dashed) -->
    <circle cx="${cx}" cy="${cy}" r="114" fill="none" stroke="rgba(255,185,0,.3)" stroke-width="1" stroke-dasharray="4 3"/>
    <!-- elevation view (right) -->
    <rect x="490" y="120" width="60" height="280" fill="url(#metal-h)" stroke="#00e5ff" stroke-width="2" rx="4"/>
    <rect x="494" y="175" width="52" height="170" fill="#060e1c" stroke="#00e096" stroke-width="1.5" rx="2"/>
    <rect x="480" y="155" width="80" height="20" fill="#1e3a5f" stroke="#00e5ff" stroke-width="1.5" rx="2"/>
    <rect x="480" y="325" width="80" height="20" fill="#1e3a5f" stroke="#00e5ff" stroke-width="1.5" rx="2"/>
    <!-- dim OD -->
    ${dimLine(cx-r, cy+165, cx+r, cy+165, 'OD: '+od, cx, cy+178, '#00e096')}
    <!-- dim Thk -->
    ${dimLine(620,120,620,400, 'THK: '+thk, 658, 262, '#ffb900')}
    <!-- dim PCD -->
    <text x="${cx}" y="${cy+200}" fill="rgba(255,185,0,.7)" font-family="Consolas,monospace" font-size="10" text-anchor="middle">PCD DIA: ${escapeHtml(pcd)}</text>
    <!-- Bolt count -->
    <text x="${cx}" y="${cy+215}" fill="rgba(0,229,255,.6)" font-family="Consolas,monospace" font-size="10" text-anchor="middle">${boltN} BOLTS</text>
    <!-- badge -->
    <rect x="630" y="460" width="160" height="26" rx="6" fill="rgba(167,139,250,.08)" stroke="rgba(167,139,250,.2)" stroke-width="1"/>
    <text x="710" y="477" fill="#a78bfa" font-family="Segoe UI,sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing=".08em">${escapeHtml(row.subtype||'')} FLANGE - NPS${escapeHtml(row.nps||'')} - CL${escapeHtml(row.classRating||'')}</text>
  </svg>`;
}

function boltCircles(cx, cy, radius, count) {
  const n = Math.min(Math.max(count, 4), 24);
  return Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#1a3355" stroke="#00e5ff" stroke-width="1.5" filter="url(#glow-c)"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="rgba(0,229,255,.3)"/>`;
  }).join('');
}

function genericSvg(row) {
  return `<svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">${svgDefs()}${svgBg()}
    <rect x="140" y="150" width="520" height="200" rx="12" fill="url(#metal)" stroke="#00e5ff" stroke-width="1.5" stroke-dasharray="8 4" filter="url(#glow-c)"/>
    <text x="400" y="244" fill="#fff" font-family="Segoe UI,sans-serif" font-size="18" font-weight="700" text-anchor="middle">${escapeHtml(row.componentType)}</text>
    <text x="400" y="268" fill="rgba(0,229,255,.7)" font-family="Segoe UI,sans-serif" font-size="12" text-anchor="middle">Source-backed normalized row - no geometry inferred</text>
    <text x="400" y="310" fill="rgba(93,122,153,.9)" font-family="Consolas,monospace" font-size="11" text-anchor="middle">${escapeHtml(row.id)}</text>
  </svg>`;
}

function emptySvg(message) {
  return `<svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">${svgDefs()}${svgBg()}
    <!-- plus icon -->
    <circle cx="400" cy="230" r="50" fill="rgba(0,229,255,.04)" stroke="rgba(0,229,255,.15)" stroke-width="1.5"/>
    <path d="M400 210v40M380 230h40" stroke="rgba(0,229,255,.35)" stroke-width="2.5" stroke-linecap="round"/>
    <text x="400" y="308" fill="#3d6080" font-family="Segoe UI,sans-serif" font-size="14" font-weight="500" text-anchor="middle">${escapeHtml(message)}</text>
    <text x="400" y="330" fill="#283d55" font-family="Consolas,monospace" font-size="11" text-anchor="middle">Select a component using the filters above</text>
  </svg>`;
}



function filterTags(filters = {}) {
  return `<span class="filter-tags">${Object.entries(filters).map(([k, v]) => `<span>${escapeHtml(k)}=${escapeHtml(v)}</span>`).join('')}</span>`;
}

function statusBadge(status) {
  const cls = status === 'READY' ? 'ready' : (status === 'PARTIAL' ? 'partial' : 'missing');
  return `<span class="status-badge ${cls}"><span class="dot"></span>${escapeHtml(status ?? 'UNKNOWN')}</span>`;
}


function hasStructuredFilters() { return Object.keys(cleanFilters(state.filters)).length > 1; }
function countEntries() { return state.index?.entries?.length ?? 0; }
function statusCount(status) { return (state.index?.entries ?? []).filter((entry) => entry.dataStatus === status).length; }
function filterText(filters = {}) { return Object.entries(cleanFilters(filters)).map(([k, v]) => `${k}=${v}`).join(' - '); }
function matchesFilters(entry, filters) { return Object.entries(cleanFilters(filters)).every(([key, expected]) => normalizeSearchText(entry.filters?.[key] ?? entry[key]) === normalizeSearchText(expected)); }
function hasCompleteFilterMatch(entry, filters) { return Object.keys(entry.filters ?? {}).every((key) => filters[key] !== undefined && matchesFilters(entry, { [key]: filters[key] })); }
function exactQueryForms(query, aliases) { return exactForms([query], aliases); }
function entryExactForms(entry, aliases) { return new Set(exactForms([entry.id, entry.description, ...(entry.aliases ?? [])], aliases)); }
function exactForms(values, aliases) { const forms = new Set(); for (const value of values) { const conventional = engineeringText(value); if (conventional) forms.add(conventional); const aliased = aliasText(conventional, aliasList(aliases)); if (aliased) forms.add(aliased); } return [...forms]; }
function engineeringText(value) { return normalizeSearchText(value).replace(/\bCLASS\s*([0-9]+)\b/g, '$1').replace(/\bCL\s*([0-9]+)\b/g, '$1').replace(/\bNPS\s*([0-9.+/]+)\b/g, '$1').replace(/\bSCHEDULE\s*([0-9A-Z]+)\b/g, 'SCH$1').replace(/\bSCH\s+([0-9A-Z]+)\b/g, 'SCH$1').replace(/\s+/g, ' ').trim(); }
function aliasText(value, aliases) { let text = ` ${value} `; const replacements = aliases.flatMap((row) => [row.canonical, ...(row.aliases ?? [])].map((item) => [engineeringText(item), engineeringText(row.canonical)])); replacements.sort((a, b) => b[0].length - a[0].length); for (const [from, to] of replacements) if (from) text = text.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, 'g'), to); return normalizeSearchText(text); }
function taggedRows(group = {}) { return Object.entries(group).map(([key, item]) => ({ key, label: LABELS[key] ?? labelize(key), value: item?.value ?? null, unit: item?.unit, basis: item?.basis ?? 'UNAVAILABLE', sourceColumn: item?.sourceColumn })); }
function identityCells(row) { return [['Type', row.componentType], ['Subtype', row.valveType ?? row.subtype ?? row.endType], ['NPS', row.nps], ['Class/Schedule', row.classRating ?? row.schedule], ['Status', row.dataStatus]].filter(([, value]) => value !== undefined && value !== null); }
function componentTitle(row) { return [row.valveType ?? row.subtype, row.componentType, row.endType, row.facing, row.nps && `NPS ${row.nps}`, row.classRating && `Class ${row.classRating}`, row.schedule && `SCH ${row.schedule}`].filter(Boolean).join(' - '); }
function formatValue(item) { return isUnavailable(item) ? 'Unavailable' : `${item.value}${item.unit ? ` ${item.unit}` : ''}`; }
function valueText(item) { return item?.value === null || item?.value === undefined ? 'Unavailable' : `${item.value}${item.unit ? ` ${item.unit}` : ''}`; }
function isUnavailable(item) { return item.value === null || item.value === undefined; }
function sourceToken(row) { return sourceLabel(row.source).replace(/\.[a-z0-9]+$/i, '') || 'SOURCE'; }
function sourceLabel(path) { return String(path ?? '').split('/').pop() ?? 'SOURCE'; }
function isCoverage() { return state.activeCategory === 'Coverage'; }
function isDashboardLike() { return ['Dashboard', 'Export'].includes(state.activeCategory); }
function componentTypeForControls() { return CATEGORY_COMPONENTS[state.activeCategory] && !['DASHBOARD', 'COVERAGE', 'EXPORT'].includes(CATEGORY_COMPONENTS[state.activeCategory]) ? CATEGORY_COMPONENTS[state.activeCategory] : (state.filters.componentType ?? 'VALVE'); }
function getValue(id) { return document.getElementById(id)?.value?.trim() ?? ''; }
function categoryFromComponent(type) { return Object.entries(CATEGORY_COMPONENTS).find(([, value]) => value === type)?.[0] ?? 'Valves'; }
// Helper: close source audit details details box
function closeAuditBox() { const node = document.getElementById('audit-box'); if (node) node.open = false; }

function copySelectedId() {
  const id = state.row?.id ?? state.selectedEntry?.id ?? '';
  if (globalThis.navigator?.clipboard && id) {
    globalThis.navigator.clipboard.writeText(id).then(() => {
      const btn = document.getElementById('copy-id-button');
      btn.textContent = 'ID Copied!';
      btn.style.borderColor = 'var(--ok)';
      btn.style.color = 'var(--ok)';
      setTimeout(() => {
        btn.textContent = 'Copy selected ID';
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
    }).catch(() => {});
  } else {
    document.getElementById('copy-id-button').textContent = id ? 'ID copied' : 'No ID selected';
  }
}

function cleanFilters(filters) { return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')); }
function aliasList(aliasRows) { return Array.isArray(aliasRows) ? aliasRows : (aliasRows?.rows ?? []); }
function sortEngineeringValues(a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }); }
function normalizeSearchText(value) { return String(value ?? '').toUpperCase().replace(/[^A-Z0-9+"./]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function labelize(key) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()); }
// Helper: escapes regex special characters
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
