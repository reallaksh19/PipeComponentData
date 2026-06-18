import { MODULES, DEFAULT_SPAN_INPUT } from './data.js';
import { renderDashboards, renderMain, renderTabs } from './render.js';

const DATA_ROOT = '..';
const state = {
  modules: MODULES,
  activeModule: 'PipeSpec DB',
  filters: { component: 'VALVE', valveType: 'GATE', endType: 'FLANGED', facing: 'RF', classRating: '150' },
  spanInput: { ...DEFAULT_SPAN_INPUT },
  allRows: [],
  rows: [],
  selectedId: null,
  selectedRow: null,
};

const actions = {
  setModule(name) {
    state.activeModule = name;
    state.selectedId = null;
    state.selectedRow = null;
    render();
  },
  setFilter(key, value) {
    state.filters[key] = value;
    if (key === 'component' && value !== 'VALVE') state.filters.valveType = '';
    if (key === 'endType' && value !== 'FLANGED') state.filters.facing = '';
    state.selectedId = null;
    applyFilters();
    render();
  },
  selectRow(id) {
    state.selectedId = id;
    state.selectedRow = state.rows.find((row) => row.id === id) ?? null;
    render();
  },
  updateSpanInput(next) {
    state.spanInput = { ...state.spanInput, ...next };
    render();
  },
};

start().catch((error) => {
  document.body.innerHTML = `<main class="panel" style="margin:20px;padding:20px">PipeTools failed to load: ${error.message}</main>`;
});

async function start() {
  state.allRows = await loadValveRows();
  applyFilters();
  bindSearch();
  render();
}

async function loadValveRows() {
  const response = await fetch(`${DATA_ROOT}/data/normalized/valves.json`);
  if (!response.ok) return [];
  const payload = await response.json();
  return payload.rows ?? [];
}

function applyFilters() {
  const filters = state.filters;
  state.rows = state.allRows.filter((row) => {
    if (filters.component && row.componentType !== filters.component) return false;
    if (filters.valveType && row.valveType !== filters.valveType) return false;
    if (filters.endType && row.endType !== filters.endType) return false;
    if (filters.facing && row.facing !== filters.facing) return false;
    if (filters.classRating && row.classRating !== filters.classRating) return false;
    if (filters.nps && row.nps !== String(filters.nps)) return false;
    return true;
  });
  state.selectedRow = state.rows.find((row) => row.id === state.selectedId) ?? state.rows[0] ?? null;
  state.selectedId = state.selectedRow?.id ?? null;
}

function bindSearch() {
  const input = document.getElementById('global-search');
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const parsed = parseSearch(input.value);
    state.activeModule = 'PipeSpec DB';
    state.filters = { ...state.filters, ...parsed };
    applyFilters();
    render();
  });
}

function parseSearch(query) {
  const q = query.toUpperCase().replace(/["#]/g, ' ').replace(/-/g, ' ');
  const next = { component: 'VALVE' };
  if (q.includes('GATE')) next.valveType = 'GATE';
  if (q.includes('GLOBE')) next.valveType = 'GLOBE';
  if (q.includes('CHECK')) next.valveType = 'CHECK';
  if (/\b(FL|FLG|FLANGED)\b/.test(q)) next.endType = 'FLANGED';
  if (/\b(BW|BUTT\s*WELD)\b/.test(q)) next.endType = 'BUTT-WELD';
  for (const facing of ['RF', 'RTJ', 'FF']) if (q.includes(facing)) next.facing = facing;
  const classMatch = q.match(/\b(150|300|600|900|1500)\b/);
  if (classMatch) next.classRating = classMatch[1];
  const sizeMatch = q.match(/\b(?:NPS\s*)?(\d+(?:\.\d+)?)\b/);
  if (sizeMatch && !['150', '300', '600', '900', '1500'].includes(sizeMatch[1])) next.nps = sizeMatch[1];
  return next;
}

function render() {
  renderTabs(state, actions.setModule);
  renderDashboards(state, actions);
  renderMain(state, actions);
}
