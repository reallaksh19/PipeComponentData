import { COMPONENTS, DISABLED_MODULES } from './data.js';
import { renderDbCoverageStrip } from './db/dbCoverage.js';
import { renderPipeSpecInspector } from './pipespecInspector.js';
import { bindPipeSpecDetailActions } from './pipespecDetailActions.js';
import { iconSvg, pipeSpanSvg } from './svg.js';
import { mountPipeSpecSvg } from './svg/pipeSpecSvgEngine.js';
import { renderPipeSpanInputs, renderPipeSpanMain } from './pipeSpan/ui.js';

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmt = (value, suffix = '') => value == null || value === '' ? '—' : `${value}${suffix}`;
const disabledModules = new Set(DISABLED_MODULES);

export function renderTabs(state, onSelect) {
  const host = document.getElementById('module-tabs');
  host.innerHTML = state.modules.map((name) => {
    const disabled = disabledModules.has(name);
    const active = !disabled && name === state.activeModule;
    const attrs = disabled ? 'disabled aria-disabled="true" title="Coming soon" tabindex="-1"' : '';
    return `<button class="tab-btn ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}" data-module="${esc(name)}" ${attrs}>${esc(name)}</button>`;
  }).join('');
  host.querySelectorAll('button:not(:disabled)').forEach((button) => button.addEventListener('click', () => onSelect(button.dataset.module)));
}

export function renderDashboards(state, actions) {
  const host = document.getElementById('dashboard-zone');
  if (state.activeModule === 'Pipe Span') return renderPipeSpanInputs(host, state, actions);
  if (state.activeModule === '2D Bundle Calc') return renderBundleInfo(host);
  const family = currentFamily(state);
  const coverage = renderDbCoverageStrip(state.dbIndex);
  const components = families(state).map((item) => card(item.family, item.label, `${item.rowCount ?? 0}`, state.filters.component === item.family, 'component')).join('');
  const subtypes = family?.subtypes?.length ? strip(subtypeTitle(family.family), family.subtypes.map((type) => card(type, prettyType(type), '', state.filters.subtype === type, 'subtype')).join('')) : '';
  host.innerHTML = `${searchStrip(state)}${coverage}${dbIndexStrip(family, state)}${strip('Database Index', components)}${subtypes}${configStrip(state, family)}`;
  host.querySelectorAll('[data-card]').forEach((button) => {
    button.addEventListener('click', () => actions.setFilter(button.dataset.group, button.dataset.card));
  });
}

function renderBundleInfo(host) {
  host.innerHTML = `<section class="strip"><div class="strip-title">2D Bundle Calc</div><div>
    <p>This tab embeds the SPL2 2D calculation bundle as a static iframe boundary.</p>
    <p class="chip">Expected path: ../spl2-bundle/spl2_master.html</p>
  </div></section>`;
}

function dbIndexStrip(family, state) {
  if (!family) return '';
  const status = state.loadingComponent ? `Loading ${state.loadingComponent}…` : `${family.rowCount} indexed rows`;
  return `<section class="strip"><div class="strip-title">Selected DB</div><div class="segment-row">
    <span class="chip">${esc(family.family)}</span><span class="chip">${esc(family.standard)}</span>
    <span class="chip">${esc(status)}</span><span class="chip">Packs: ${esc((family.repositoryPaths ?? [family.repositoryPath]).filter(Boolean).length)}</span><span class="chip">SVG: ${family.svgSupported ? 'Yes' : 'No'}</span>
  </div></section>`;
}

function searchStrip(state) {
  if (!state.search) return '';
  const chips = state.search.chips.map((chip) => `<span class="chip">${esc(chip.label)}: ${esc(chip.value)}</span>`).join('');
  return `<section class="strip"><div class="strip-title">Search</div><div class="segment-row">
    <span class="chip">${esc(state.search.query)}</span>${chips}<span class="chip">${esc(state.search.matchType)}</span>
  </div></section>`;
}

function configStrip(state, family) {
  const fields = [['End', 'endType'], ['Facing', 'facing'], ['Class', 'classRating'], ['Schedule', 'schedule'], ['Size', 'nps']]
    .filter(([, key]) => family?.availableFilters?.includes(key));
  const html = fields.map(([label, key]) => filterGroup(label, key, fieldValues(state.allRows, key), state.filters[key])).join('');
  return html ? `<section class="strip"><div class="strip-title">Filters</div><div class="segment-row">${html}</div></section>` : '';
}

function filterGroup(label, key, values, selected) {
  const all = `<button class="seg-btn ${!selected ? 'active' : ''}" data-group="${key}" data-card="">All</button>`;
  const buttons = values.map((value) => `<button class="seg-btn ${String(selected) === String(value) ? 'active' : ''}" data-group="${key}" data-card="${esc(value)}">${esc(displayValue(key, value))}</button>`).join('');
  return `<span class="segment-label">${label}</span>${all}${buttons}`;
}

function strip(title, html) {
  return `<section class="strip"><div class="strip-title">${title}</div><div class="card-row">${html}</div></section>`;
}

function card(key, label, count, active, group) {
  return `<button class="card-btn ${active ? 'active' : ''}" data-group="${group}" data-card="${esc(key)}">${iconSvg(key)}<strong>${esc(label)}</strong><small>${esc(count)}</small></button>`;
}

export function renderMain(state, actions) {
  if (state.activeModule === 'Pipe Span') return renderPipeSpanMain(state, actions, pipeSpanSvg);
  if (state.activeModule === '2D Bundle Calc') return renderBundle();
  renderPipeSpecTable(state, actions);
}

function renderPipeSpecTable(state, actions) {
  const family = currentFamily(state);
  const fields = tableFields(family);
  const sourceLabel = family ? (family.repositoryPaths ?? [family.repositoryPath]).filter(Boolean).join(' + ') : 'Dashboard-filtered component data';
  document.getElementById('table-title').textContent = family ? `${family.label} DB` : 'PipeSpec DB';
  document.getElementById('table-kicker').textContent = family ? `${sourceLabel} · ${family.standard}` : sourceLabel;
  document.getElementById('table-count').textContent = `${state.rows.length} rows`;
  document.getElementById('table-frame').innerHTML = `<table><thead><tr>${fields.map((field) => `<th>${esc(fieldLabel(field))}</th>`).join('')}</tr></thead><tbody>${state.rows.map((row) => rowHtml(row, fields, state.selectedId)).join('')}</tbody></table>`;
  document.querySelectorAll('[data-row-id]').forEach((row) => row.addEventListener('click', () => actions.selectRow(row.dataset.rowId)));
  document.getElementById('inspector-body').innerHTML = renderPipeSpecInspector(state.selectedRow);
  mountInspectorSvg(state.selectedRow);
  bindPipeSpecDetailActions(state.selectedRow);
}

function mountInspectorSvg(row) {
  const host = document.querySelector('[data-pipespec-svg-host]');
  if (!host || !row) return;
  const rowId = String(row.id ?? '');
  host.dataset.rowId = rowId;
  mountPipeSpecSvg(row, host, { width: 390, height: 262 }).catch((error) => {
    if (host.dataset.rowId === rowId) host.innerHTML = `<div class="svg-unavailable">Source SVG failed: ${esc(error.message)}</div>`;
  });
}

function rowHtml(row, fields, selectedId) {
  return `<tr class="${row.id === selectedId ? 'selected' : ''}" data-row-id="${esc(row.id)}">${fields.map((field) => `<td>${esc(cellValue(row, field))}</td>`).join('')}</tr>`;
}

function renderBundle() {
  document.getElementById('table-title').textContent = '2D Bundle Calc';
  document.getElementById('table-count').textContent = 'iframe';
  document.getElementById('table-frame').innerHTML = '<iframe class="bundle-frame" src="../spl2-bundle/spl2_master.html" title="SPL2 2D Calc Bundle"></iframe>';
  document.getElementById('inspector-body').innerHTML = '<p>Legacy bundle is isolated. No shared state is mixed with PipeTools modules yet.</p>';
}

function currentFamily(state) {
  return state.currentDbFamily ?? families(state).find((entry) => entry.family === state.filters.component) ?? null;
}

function families(state) {
  return state.dbFamilies?.length ? state.dbFamilies : COMPONENTS.map((item) => ({ family: item.key, label: item.label, rowCount: item.count ?? 0 }));
}

function tableFields(family) {
  const keys = family?.keyFields?.length ? family.keyFields : ['componentType', 'subtype', 'nps', 'dn'];
  return [...new Set([...keys, 'dataStatus', 'source'])].slice(0, 9);
}

function cellValue(row, field) {
  if (field === 'subtype') return subtypeOf(row);
  if (field === 'valveType') return row.valveType ?? subtypeOf(row);
  if (field === 'classRating') return row.classRating ? `CL ${row.classRating}` : '—';
  if (field === 'componentType') return row.componentType ?? row.component ?? '—';
  if (field === 'source') return shortSource(row.source);
  return fmt(row[field]);
}

function fieldValues(rows, key) {
  return [...new Set(rows.map((row) => valueForFilter(row, key)).filter((value) => value != null && value !== ''))].sort(sortValues);
}

function valueForFilter(row, key) {
  if (key === 'subtype') return subtypeOf(row);
  if (key === 'endType') return row.endType ?? row.endConnection;
  if (key === 'nps') return row.nps ?? row.largeNps;
  if (key === 'schedule') return row.schedule ?? row.largeSchedule ?? row.scheduleOrRating;
  return row[key];
}

function subtypeOf(row) {
  return row.subtype ?? row.valveType ?? row.flangeType ?? row.fittingType ?? row.reducerType ?? row.oletType ?? row.supportKind ?? row.type ?? null;
}

function displayValue(key, value) {
  if (key === 'classRating') return `CL ${value}`;
  if (key === 'nps') return `NPS ${value}`;
  return prettyType(value);
}

function prettyType(value) {
  return String(value ?? '').replaceAll('_', ' ');
}

function fieldLabel(field) {
  return ({ nps: 'NPS', dn: 'DN', classRating: 'Class', endType: 'End', dataStatus: 'Status', componentType: 'Component' }[field]) ?? prettyType(field);
}

function subtypeTitle(family) {
  return ({ VALVE: 'Valve Type', FLANGE: 'Flange Type', FITTING: 'Fitting Type', GASKET: 'Gasket Type', SUPPORT: 'Support Type', REDUCER: 'Reducer Type', OLET: 'Olet Type' }[family]) ?? 'Type';
}

function shortSource(source) {
  return source ? String(source).split('/').pop() : '—';
}

function sortValues(a, b) {
  const na = Number(a), nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}
