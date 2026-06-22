import { filterPipeSpecRows, isFacingApplicable, toDashboardFilterPatch } from './pipespecFilters.js';

export const DEFAULT_PIPESPEC_FILTERS = {
  component: 'VALVE',
  subtype: null,
  endType: null,
  facing: null,
  classRating: null,
  nps: null,
  dn: null,
  schedule: null,
};

export function createInitialPipeSpecState(overrides = {}) {
  const state = {
    filters: { ...DEFAULT_PIPESPEC_FILTERS, ...(overrides.filters ?? {}) },
    selectedRowId: overrides.selectedRowId ?? null,
    searchQuery: overrides.searchQuery ?? '',
    parsedSearch: overrides.parsedSearch ?? null,
    searchChips: overrides.searchChips ?? [],
    matchType: overrides.matchType ?? null,
  };
  return clearInvalidSelections(state, overrides.rows ?? []);
}

export function reducePipeSpecState(state, action = {}) {
  switch (action.type) {
    case 'SET_COMPONENT':
      return clearInvalidSelections({ ...state, filters: { ...DEFAULT_PIPESPEC_FILTERS, component: action.value }, selectedRowId: null });
    case 'SET_SUBTYPE':
      return updateFilter(state, 'subtype', action.value);
    case 'SET_END_TYPE':
      return updateFilter(state, 'endType', action.value);
    case 'SET_FACING':
      return updateFilter(state, 'facing', action.value);
    case 'SET_CLASS':
      return updateFilter(state, 'classRating', action.value);
    case 'SET_NPS':
      return updateFilter(state, 'nps', action.value);
    case 'SELECT_ROW':
      return { ...state, selectedRowId: action.value ?? null };
    case 'APPLY_SEARCH_RESULT':
      return clearInvalidSelections({ ...state, ...(action.value ?? {}) }, action.rows ?? []);
    case 'ROWS_CHANGED':
      return clearInvalidSelections(state, action.rows ?? []);
    default:
      return state;
  }
}

export function clearInvalidSelections(state, rows = []) {
  const filters = normalizeFilters(state.filters ?? {});
  if (!isFacingApplicable(filters)) filters.facing = null;
  const visibleRows = filterPipeSpecRows(rows, filters);
  const selectedRowId = visibleRows.some((row) => sameRowId(row?.id, state.selectedRowId)) ? state.selectedRowId : null;
  return { ...state, filters, selectedRowId };
}

export function selectedRowForId(rows = [], selectedRowId = null) {
  if (selectedRowId == null || selectedRowId === '') return null;
  return rows.find((row) => sameRowId(row?.id, selectedRowId)) ?? null;
}

export function actionFromFilterKey(key, value) {
  const typeByKey = { component: 'SET_COMPONENT', valveType: 'SET_SUBTYPE', subtype: 'SET_SUBTYPE', endType: 'SET_END_TYPE', facing: 'SET_FACING', classRating: 'SET_CLASS', nps: 'SET_NPS' };
  return { type: typeByKey[key] ?? 'SET_SUBTYPE', value };
}

function updateFilter(state, key, value) {
  return clearInvalidSelections({ ...state, filters: { ...state.filters, [key]: value || null }, selectedRowId: null });
}

function normalizeFilters(filters) {
  return { ...DEFAULT_PIPESPEC_FILTERS, ...toDashboardFilterPatch(filters) };
}

function sameRowId(left, right) {
  return String(left ?? '') === String(right ?? '');
}
