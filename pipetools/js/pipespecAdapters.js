import { applySearchToRows } from './search/search.js';
import { renderSvgPreview } from './svg/inspector.js';
import { resolveSvgKey as resolveRegistrySvgKey } from './svg/registry.js';
import { toDashboardFilterPatch } from './pipespecFilters.js';
import { reducePipeSpecState } from './pipespecState.js';

export function runPipeSpecSearch(query, rows = [], options = {}) {
  return applySearchToRows(query, rows, options);
}

export function applySearchResultToState(state, searchResult = {}) {
  const filters = {
    ...state.filters,
    ...toDashboardFilterPatch(searchResult.parsed?.filters ?? searchResult.filters ?? searchResult.parsed ?? {}),
  };
  return reducePipeSpecState(state, {
    type: 'APPLY_SEARCH_RESULT',
    rows: searchResult.rows ?? [],
    value: {
      filters,
      parsedSearch: searchResult.parsed ?? null,
      searchQuery: searchResult.parsed?.raw ?? searchResult.query ?? state.searchQuery,
      searchChips: searchResult.chips ?? [],
      matchType: searchResult.results?.[0]?.matchType ?? 'none',
    },
  });
}

export function resolveSvgKey(row = {}) {
  return resolveRegistrySvgKey(row);
}

export function resolveInspectorSvg(row, options = {}) {
  if (!row) return options.emptySvg ?? '<div class="svg-empty">No selection</div>';
  return renderSvgPreview(row, options);
}
