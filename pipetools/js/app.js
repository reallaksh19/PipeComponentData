import { DEFAULT_SPAN_INPUT, DISABLED_MODULES, MODULES } from './data.js';
import { loadDbIndex, getDbFamilies, getDbFamily } from './db/dbIndex.js';
import { loadComponentRows } from './loaders/componentLoader.js';
import { filterPipeSpecRows } from './pipespecFilters.js';
import { applySearchResultToState, runPipeSpecSearch } from './pipespecAdapters.js';
import { actionFromFilterKey, createInitialPipeSpecState, reducePipeSpecState } from './pipespecState.js';
import { renderDashboards, renderMain, renderTabs } from './render.js?v=pipe1-native-recovery-20260622b';
import { updateUiScope } from './uiScopePatch.js';

const DATA_ROOT = '..';
const DB_INDEX_URL = './data/db-index.json';
const renderGuard = { active: false, queued: false, burst: 0 };
const disabledModules = new Set(DISABLED_MODULES);
let loadToken = 0;
let pipeSpecState = createInitialPipeSpecState({
  filters: { component: 'VALVE', subtype: 'GATE', endType: 'FLANGED', facing: 'RF', classRating: '150' },
});

const state = {
  modules: MODULES,
  activeModule: 'PipeSpec DB',
  filters: {},
  spanInput: { ...DEFAULT_SPAN_INPUT },
  search: null,
  dbIndex: null,
  dbFamilies: [],
  currentDbFamily: null,
  loadingComponent: null,
  allRows: [],
  rows: [],
  selectedId: null,
  selectedRow: null,
};

const actions = {
  setModule(name) {
    if (!name || disabledModules.has(name) || state.activeModule === name) return;
    state.activeModule = name;
    pipeSpecState = reducePipeSpecState(pipeSpecState, { type: 'SELECT_ROW', value: null });
    syncStateFromPipeSpec();
    requestRender();
  },
  setFilter(key, value) {
    if (key === 'component') {
      void setComponent(value);
      return;
    }
    const before = JSON.stringify(pipeSpecState.filters);
    pipeSpecState = reducePipeSpecState(pipeSpecState, actionFromFilterKey(key, value));
    if (JSON.stringify(pipeSpecState.filters) === before && !pipeSpecState.selectedRowId) return;
    state.search = null;
    applyFilters();
    requestRender();
  },
  selectRow(id) {
    if (pipeSpecState.selectedRowId === id) return;
    pipeSpecState = reducePipeSpecState(pipeSpecState, { type: 'SELECT_ROW', value: id });
    syncStateFromPipeSpec();
    requestRender();
  },
  updateSpanInput(next) {
    const merged = { ...state.spanInput, ...next };
    if (JSON.stringify(merged) === JSON.stringify(state.spanInput)) return;
    state.spanInput = merged;
    requestRender();
  },
};

start().catch((error) => showFatal(error));

async function start() {
  state.dbIndex = await loadDbIndex({ url: DB_INDEX_URL });
  state.dbFamilies = getDbFamilies(state.dbIndex);
  state.allRows = await loadFamilyRows(pipeSpecState.filters.component);
  applyFilters();
  bindSearch();
  requestRender();
}

async function setComponent(value) {
  const component = String(value ?? '').toUpperCase();
  if (!component || component === pipeSpecState.filters.component) return;
  const token = ++loadToken;
  state.loadingComponent = component;
  state.search = null;
  state.allRows = [];
  state.rows = [];
  pipeSpecState = reducePipeSpecState(pipeSpecState, { type: 'SET_COMPONENT', value: component });
  syncStateFromPipeSpec();
  requestRender();

  const rows = await loadFamilyRows(component);
  if (token !== loadToken) return;
  state.loadingComponent = null;
  state.allRows = rows;
  applyFilters();
  requestRender();
}

async function loadFamilyRows(component) {
  const result = await loadComponentRows(component, { root: DATA_ROOT, dbIndex: state.dbIndex });
  return result.rows;
}

function applyFilters() {
  const visible = filterPipeSpecRows(state.allRows, pipeSpecState.filters);
  pipeSpecState = reducePipeSpecState(pipeSpecState, { type: 'ROWS_CHANGED', rows: visible });
  if (!pipeSpecState.selectedRowId && visible[0]) {
    pipeSpecState = reducePipeSpecState(pipeSpecState, { type: 'SELECT_ROW', value: visible[0].id });
  }
  state.rows = visible;
  syncStateFromPipeSpec();
}

function syncStateFromPipeSpec() {
  state.filters = { ...pipeSpecState.filters, valveType: pipeSpecState.filters.subtype };
  state.search = pipeSpecState.searchQuery ? {
    query: pipeSpecState.searchQuery,
    chips: pipeSpecState.searchChips,
    matchType: pipeSpecState.matchType ?? 'none',
  } : state.search;
  state.currentDbFamily = getDbFamily(state.dbIndex, pipeSpecState.filters.component);
  state.selectedId = pipeSpecState.selectedRowId;
  state.selectedRow = state.rows.find((row) => row.id === state.selectedId) ?? null;
}

function bindSearch() {
  const input = document.getElementById('global-search');
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const searchResult = runPipeSpecSearch(input.value, state.allRows);
    state.activeModule = 'PipeSpec DB';
    pipeSpecState = applySearchResultToState(pipeSpecState, searchResult);
    applyFilters();
    requestRender();
  });
}

function requestRender() {
  if (renderGuard.active) {
    renderGuard.queued = true;
    return;
  }
  render();
}

function render() {
  if (renderGuard.active) {
    renderGuard.queued = true;
    return;
  }
  renderGuard.active = true;
  try {
    renderTabs(state, actions.setModule);
    renderDashboards(state, actions);
    renderMain(state, actions);
    updateUiScope();
  } catch (error) {
    showFatal(error);
  } finally {
    renderGuard.active = false;
    if (renderGuard.queued && renderGuard.burst < 2) {
      renderGuard.queued = false;
      renderGuard.burst += 1;
      queueMicrotask(requestRender);
    } else {
      renderGuard.queued = false;
      renderGuard.burst = 0;
    }
  }
}

function showFatal(error) {
  const message = error?.message ?? String(error);
  document.body.innerHTML = `<main class="panel" style="margin:20px;padding:20px">PipeTools failed to load: ${message}</main>`;
}
