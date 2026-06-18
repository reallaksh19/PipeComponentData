import { MODULES, DEFAULT_SPAN_INPUT } from './data.js';
import { renderDashboards, renderMain, renderTabs } from './render.js';
import { applySearchToRows } from './search/search.js';

const DATA_ROOT = '..';
const state = {
  modules: MODULES,
  activeModule: 'PipeSpec DB',
  filters: { component: 'VALVE', valveType: 'GATE', endType: 'FLANGED', facing: 'RF', classRating: '150' },
  spanInput: { ...DEFAULT_SPAN_INPUT },
  search: null,
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
    state.search = null;
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
  setDefaultSelection();
}

function bindSearch() {
  const input = document.getElementById('global-search');
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const query = input.value;
    const searchResult = applySearchToRows(query, state.allRows);
    state.activeModule = 'PipeSpec DB';
    state.filters = { ...state.filters, ...toDashboardFilters(searchResult.parsed.filters) };
    state.search = { query, chips: searchResult.chips, matchType: searchResult.results[0]?.matchType ?? 'none' };
    state.rows = searchResult.rows;
    setDefaultSelection();
    render();
  });
}

function toDashboardFilters(filters) {
  const allowed = ['component', 'valveType', 'endType', 'facing', 'classRating', 'nps'];
  return Object.fromEntries(Object.entries(filters).filter(([key]) => allowed.includes(key)));
}

function setDefaultSelection() {
  state.selectedRow = state.rows.find((row) => row.id === state.selectedId) ?? state.rows[0] ?? null;
  state.selectedId = state.selectedRow?.id ?? null;
}

function render() {
  renderTabs(state, actions.setModule);
  renderDashboards(state, actions);
  renderMain(state, actions);
}
