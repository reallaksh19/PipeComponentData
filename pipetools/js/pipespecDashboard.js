import { getDashboardCounts } from './pipespecFilters.js';
import { renderPipeSpecInspector } from './pipespecInspector.js';
import { bindPipeSpecTable, renderPipeSpecTable } from './pipespecTable.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const COMPONENTS = ['PIPE', 'VALVE', 'FLANGE', 'FITTING', 'GASKET', 'SUPPORT'];
const VALVE_TYPES = ['GATE', 'GLOBE', 'CHECK', 'BALL', 'BUTTERFLY', 'PLUG'];
const END_TYPES = ['FLANGED', 'BUTT-WELD', 'SOCKET-WELD', 'THREADED'];
const FACINGS = ['RF', 'RTJ', 'FF'];
const CLASSES = ['150', '300', '600', '900', '1500'];

export function mountPipeSpecDashboard(root, options = {}) {
  const rows = options.rows ?? [];
  const state = options.state ?? {};
  const visibleRows = options.visibleRows ?? rows;
  root.innerHTML = `${renderDashboardZone(rows, state)}<section class="result-layout"><div id="pipespec-table-host">${renderPipeSpecTable(visibleRows, state)}</div><aside id="pipespec-inspector-host">${renderPipeSpecInspector(options.selectedRow ?? null, options)}</aside></section>`;
  bindPipeSpecTable(root, options.onSelectRow ?? (() => {}));
  root.querySelectorAll('[data-filter-key]').forEach((button) => button.addEventListener('click', () => options.onFilter?.(button.dataset.filterKey, button.dataset.filterValue)));
}

export function renderDashboardZone(rows = [], state = {}) {
  const counts = getDashboardCounts(rows, state.filters ?? {});
  const search = renderSearchSummary(state);
  return `${search}${strip('Components', cards(COMPONENTS, 'component', state.filters?.component, counts.components))}${strip('Valve Type', cards(VALVE_TYPES, 'subtype', state.filters?.subtype, counts.subtypes))}${strip('Configuration', configCards(state, counts))}`;
}

function renderSearchSummary(state) {
  if (!state.searchQuery && !state.searchChips?.length) return '';
  const chips = (state.searchChips ?? []).map((chip) => `<span class="chip">${esc(chip.label)}: ${esc(chip.value)}</span>`).join('');
  return `<section class="strip"><div class="strip-title">Search</div><div class="segment-row"><span class="chip">${esc(state.searchQuery)}</span>${chips}<span class="chip">${esc(state.matchType ?? 'none')}</span></div></section>`;
}

function configCards(state, counts) {
  return `${label('End')}${cards(END_TYPES, 'endType', state.filters?.endType, counts.endTypes)}${label('Facing')}${cards(FACINGS, 'facing', state.filters?.facing, counts.facings)}${label('Class')}${cards(CLASSES, 'classRating', state.filters?.classRating, counts.classes)}`;
}

function cards(items, key, active, counts = {}) {
  return items.map((item) => `<button class="seg-btn ${String(active ?? '') === item ? 'active' : ''}" data-filter-key="${key}" data-filter-value="${esc(item)}">${esc(item)} <small>${counts[item] ?? 0}</small></button>`).join('');
}

function strip(title, html) {
  return `<section class="strip"><div class="strip-title">${esc(title)}</div><div class="card-row">${html}</div></section>`;
}

function label(text) {
  return `<span class="segment-label">${esc(text)}</span>`;
}
