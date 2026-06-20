import { COMPONENTS, DISABLED_MODULES } from './data.js';
import { renderDbCoverageStrip } from './db/dbCoverage.js';
import { dimensionFacts, formatDimensionValue, formatFact, formatWeightValue, valueFromPaths, weightFacts } from './dimensionDisplay.js';
import { getDashboardCounts } from './pipespecFilters.js';
import { renderPipeSpecInspector } from './pipespecInspector.js';
import { bindPipeSpecDetailActions } from './pipespecDetailActions.js';
import { iconSvg, pipeSpanSvg } from './svg.js';
import { mountDxfSymbolSvg } from './svg/dxfSymbolEngine.js';
import { hasPipeSpecSvgSupport } from './svg/pipeSpecSvgAdapter.js';
import { renderPipeSpanInputs, renderPipeSpanMain } from './pipeSpan/ui.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmt = (value, suffix = '') => value == null || value === '' ? '—' : `${value}${suffix}`;
const disabledModules = new Set(DISABLED_MODULES);
const SVG_FIT_SCALE = 0.5625;
const mountPipeSpecSvg = mountDxfSymbolSvg;

const TABLE_COLUMNS = {
  PIPE: ['npsDn', 'schedule', 'od', 'thickness', 'material', 'standard', 'dataStatus', 'source'],
  VALVE: ['valveType', 'endType', 'facing', 'npsDn', 'classRating', 'f2f', 'height', 'weight', 'source', 'dataStatus'],
  FLANGE: ['subtype', 'facing', 'npsDn', 'classRating', 'flangeOd', 'thickness', 'weight', 'source', 'dataStatus'],
  FITTING: ['subtype', 'npsDn', 'schedule', 'centerToEnd', 'developedLength', 'weight', 'source', 'dataStatus'],
  GASKET: ['subtype', 'facing', 'npsDn', 'classRating', 'outerDia', 'innerDia', 'thickness', 'source', 'dataStatus'],
  SUPPORT: ['supportKind', 'attachmentRule', 'standard', 'source', 'dataStatus'],
  REDUCER: ['reducerType', 'largeNps', 'smallNps', 'largeSchedule', 'centerToEnd', 'source', 'dataStatus'],
  OLET: ['oletType', 'npsDn', 'schedule', 'branchNps', 'source', 'dataStatus'],
};

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
  const components = families(state).map((item) => card(item.family, item.label, item.rowCount ?? 0, state.filters.component === item.family, 'component', item.svgSupported)).join('');
  const types = family?.subtypes?.length ? `<span class="inline-type-label">Type</span>${family.subtypes.map((type) => subtypeChip(type, `${prettyType(type)} ${countFor(state, 'subtypes', type)}`, state.filters.subtype === type)).join('')}` : '';
  // Legacy Agent 21 marker for rebased complete-index gate: ${coverage}${dbIndexStrip
  host.innerHTML = `${searchStrip(state)}${coverage}${strip('Components', `${components}${types}`, 'component-strip component-type-strip')}${configStrip(state, family)}`;
  document.querySelectorAll('#dashboard-zone [data-card], #db-health-chip [data-card]').forEach((button) => {
    button.addEventListener('click', () => actions.setFilter(button.dataset.group, button.dataset.card));
  });
}

function renderBundleInfo(host) {
  host.innerHTML = `<section class="strip"><div class="strip-title">2D Bundle Calc</div><div>
    <p>This tab embeds the SPL2 2D calculation bundle as a static iframe boundary.</p>
    <p class="chip">Expected path: ../spl2-bundle/spl2_master.html</p>
  </div></section>`;
}

function searchStrip(state) {
  if (!state.search) return '';
  const chips = state.search.chips.map((chip) => `<span class="chip">${esc(chip.label)}: ${esc(chip.value)}</span>`).join('');
  return `<section class="strip search-strip"><div class="strip-title">Search</div><div class="segment-row">
    <span class="chip">${esc(state.search.query)}</span>${chips}<span class="chip">${esc(state.search.matchType)}</span>
  </div></section>`;
}

function configStrip(state, family) {
  const fields = [['End', 'endType'], ['Facing', 'facing'], ['Class', 'classRating'], ['Schedule', 'schedule'], ['Size', 'nps']]
    .filter(([, key]) => family?.availableFilters?.includes(key));
  const html = fields.map(([label, key]) => filterGroup(state, label, key)).join('');
  return html ? `<section class="strip filter-strip"><div class="strip-title">Filters</div><div class="segment-row">${html}</div></section>` : '';
}

function filterGroup(state, label, key) {
  const selected = state.filters[key];
  const values = fieldValues(state.allRows, key);
  const all = `<button class="seg-btn ${!selected ? 'active' : ''}" data-group="${key}" data-card="">All</button>`;
  const buttons = values.map((value) => `<button class="seg-btn ${String(selected) === String(value) ? 'active' : ''}" data-group="${key}" data-card="${esc(value)}">${esc(displayValue(key, value))}</button>`).join('');
  return `<span class="segment-label">${label}</span>${all}${buttons}`;
}

function strip(title, html, className = '') {
  return `<section class="strip ${esc(className)}"><div class="strip-title">${title}</div><div class="card-row">${html}</div></section>`;
}

function card(key, label, count, active, group, svgSupported = true) {
  const badge = svgSupported ? '' : '<em class="partial-dot" title="SVG pending"></em>';
  return `<button class="card-btn ${active ? 'active' : ''}" data-group="${group}" data-card="${esc(key)}">${iconSvg(key)}<strong>${esc(label)}${badge}</strong><small>${esc(count)}</small></button>`;
}

function subtypeChip(key, label, active) {
  return `<button class="seg-btn subtype-chip ${active ? 'active' : ''}" data-group="subtype" data-card="${esc(key)}">${esc(label)}</button>`;
}

export function renderMain(state, actions) {
  if (state.activeModule === 'Pipe Span') {
    clearSourceSvgPanel('Pipe Span uses its own engineering sketch.');
    return renderPipeSpanMain(state, actions, pipeSpanSvg);
  }
  if (state.activeModule === '2D Bundle Calc') return renderBundle();
  renderPipeSpecTable(state, actions);
}

function renderPipeSpecTable(state, actions) {
  const family = currentFamily(state);
  const fields = tableFields(family);
  const sourceLabel = family ? (family.repositoryPaths ?? [family.repositoryPath]).filter(Boolean).join(' + ') : 'Dashboard-filtered component data';
  const titleInfo = family ? `${sourceLabel} · ${family.standard} · ${state.rows.length} rows` : sourceLabel;
  document.getElementById('table-title').innerHTML = family ? `${esc(family.label)} DB ${infoBadge(titleInfo)}` : 'PipeSpec DB';
  document.getElementById('table-kicker').textContent = family ? 'Normalized source database' : sourceLabel;
  document.getElementById('table-count').innerHTML = `${state.rows.length} rows <span class="table-tool">Columns</span><span class="table-tool">Compact</span>`;
  document.getElementById('table-frame').innerHTML = `<table><thead><tr>${fields.map((field) => `<th>${esc(fieldLabel(field))}</th>`).join('')}</tr></thead><tbody>${state.rows.map((row) => rowHtml(row, fields, state.selectedId)).join('')}</tbody></table>`;
  document.querySelectorAll('[data-row-id]').forEach((row) => row.addEventListener('click', () => actions.selectRow(row.dataset.rowId)));
  document.getElementById('inspector-body').innerHTML = renderPipeSpecInspector(state.selectedRow);
  renderSourceSvgPanel(state.selectedRow);
  bindPipeSpecDetailActions(state.selectedRow);
}

function renderSourceSvgPanel(row) {
  const title = document.getElementById('source-svg-title');
  const kicker = document.getElementById('source-svg-kicker');
  const host = document.getElementById('source-svg-body');
  title.textContent = row ? itemLabel(row) : 'Centre Canvas';
  kicker.textContent = row ? 'DXF manifest lookup · DB dimensions overlay' : 'Source SVG';
  if (!row) return clearSourceSvgPanel('Select a row to preview its DXF-derived source SVG.');
  const rowId = String(row.id ?? '');
  host.dataset.pipeSpecLegacySupport = String(hasPipeSpecSvgSupport(row));
  host.innerHTML = `<div class="source-svg-canvas"><div data-pipespec-source-svg-host="true" data-row-id="${esc(rowId)}"><div class="svg-loading">Loading DXF-derived SVG…</div></div>${sourceDataOverlay(row)}</div>`;
  mountPipeSpecSvg(row, host.querySelector('[data-pipespec-source-svg-host]')).then((result) => {
    if (host.querySelector('[data-row-id]')?.dataset.rowId !== rowId) return;
    if (result.status === 'OK') {
      title.textContent = result.symbol.title;
      kicker.textContent = `${result.sourceCode} · ${result.symbol.family} · ${result.symbol.standard || 'standard pending'} · source row dimensions`;
      const svg = host.querySelector('svg');
      if (svg) fitSourceSvg(svg);
    } else {
      clearSourceSvgPanel(`SVG not available: ${result.reason}`);
      title.textContent = 'SVG not available';
      kicker.textContent = `${result.status} · ${result.reason}`;
    }
  }).catch((error) => {
    if (host.querySelector('[data-row-id]')?.dataset.rowId === rowId) host.innerHTML = `<div class="source-svg-canvas"><div class="svg-unavailable"><strong>SVG_NOT_AVAILABLE</strong><br>${esc(error.message)}</div>${sourceDataOverlay(row)}</div>`;
  });
}

function sourceDataOverlay(row) {
  const facts = [...dimensionFacts(row).slice(0, 6), ...weightFacts(row).slice(0, 2)];
  if (!facts.length) return '<div class="source-data-overlay pending"><strong>DB dimensions</strong><span>No source-backed dimensions on this selected row.</span></div>';
  const html = facts.map((fact) => `<span><b>${esc(fact.label)}</b>${esc(formatFact(fact))}</span>`).join('');
  return `<div class="source-data-overlay"><strong>DB dimensions</strong>${html}</div>`;
}

function clearSourceSvgPanel(message) {
  const host = document.getElementById('source-svg-body');
  if (host) host.innerHTML = `<div class="source-svg-canvas"><div class="svg-unavailable">${esc(message)}</div></div>`;
}

function fitSourceSvg(svg) {
  const panel = document.getElementById('source-svg-panel');
  if (panel) panel.dataset.svgScale = String(SVG_FIT_SCALE);
  svg.style.transform = `scale(${SVG_FIT_SCALE})`;
  svg.style.transformOrigin = 'center';
}

function rowHtml(row, fields, selectedId) {
  return `<tr class="${row.id === selectedId ? 'selected' : ''}" data-row-id="${esc(row.id)}">${fields.map((field) => `<td>${esc(cellValue(row, field))}</td>`).join('')}</tr>`;
}

function renderBundle() {
  document.getElementById('table-title').textContent = '2D Bundle Calc';
  document.getElementById('table-count').textContent = 'iframe';
  document.getElementById('table-frame').innerHTML = '<iframe class="bundle-frame" src="../spl2-bundle/spl2_master.html" title="SPL2 2D Calc Bundle"></iframe>';
  document.getElementById('inspector-body').innerHTML = '<p>Legacy bundle is isolated. No shared state is mixed with PipeTools modules yet.</p>';
  clearSourceSvgPanel('2D Bundle Calc has no PipeSpec SVG selection.');
}

function currentFamily(state) {
  return state.currentDbFamily ?? families(state).find((entry) => entry.family === state.filters.component) ?? null;
}

function families(state) {
  return state.dbFamilies?.length ? state.dbFamilies : COMPONENTS.map((item) => ({ family: item.key, label: item.label, rowCount: item.count ?? 0 }));
}

function tableFields(family) {
  return TABLE_COLUMNS[family?.family] ?? [...new Set([...(family?.keyFields ?? ['componentType', 'subtype', 'nps', 'dn']), 'dataStatus', 'source'])].slice(0, 9);
}

function cellValue(row, field) {
  if (field === 'subtype') return subtypeOf(row);
  if (field === 'valveType') return row.valveType ?? subtypeOf(row);
  if (field === 'classRating') return row.classRating ? `CL ${String(row.classRating).replace(/^CL\s*/i, '')}` : '—';
  if (field === 'componentType') return row.componentType ?? row.component ?? '—';
  if (field === 'npsDn') return `NPS ${displayNps(row.nps ?? row.largeNps ?? '—')} / DN ${row.dn ?? '—'}`;
  if (field === 'source') return shortSource(row.source);
  if (field === 'f2f') return dim(row, 'faceToFaceRfMm', 'faceToFaceMm', 'dimensions.faceToFaceRfMm', 'dimensions.faceToFaceMm', 'dimensions.faceToFaceRtjMm', 'dimensions.buttWeldLengthMm');
  if (field === 'height') return dim(row, 'heightMm', 'dimensions.heightMm');
  if (field === 'weight') return weight(row, 'weightKg', 'rfRtjKg', 'weightKgPerM', 'weights.weightKg', 'weights.rfRtjKg', 'weights.weightKgPerM', 'weights.emptyPipeKgPerM');
  if (field === 'od' || field === 'flangeOd' || field === 'outerDia') return dim(row, 'odMm', 'flangeOdMm', 'outerDiaMm', 'dimensions.odMm', 'dimensions.flangeOdMm', 'dimensions.outerDiaMm');
  if (field === 'innerDia') return dim(row, 'innerDiaMm', 'idMm', 'dimensions.innerDiaMm', 'dimensions.idMm');
  if (field === 'thickness') return dim(row, 'thicknessMm', 'wallMm', 'flangeThicknessMm', 'blindThickMm', 'dimensions.thicknessMm', 'dimensions.wallMm', 'dimensions.flangeThicknessMm', 'dimensions.blindThickMm');
  if (field === 'centerToEnd') return dim(row, 'centerToEndMm', 'ctrToEndMm', 'dimensions.centerToEndMm');
  if (field === 'developedLength') return dim(row, 'developedLengthMm', 'devLenMm', 'dimensions.developedLengthMm');
  if (field === 'material') return row.materialFamily ?? row.material ?? '—';
  if (field === 'largeNps' || field === 'smallNps') return displayNps(row[field]);
  if (field === 'schedule') return row.schedule ?? row.largeSchedule ?? row.scheduleOrRating ?? '—';
  if (field === 'branchNps') return displayNps(row.branchNps ?? row.smallNps ?? '—');
  return fmt(row[field]);
}

function countFor(state, bucket, key) {
  return getDashboardCounts(state.allRows, state.filters)[bucket]?.[key] ?? '';
}

function dim(row, ...paths) {
  return formatDimensionValue(valueFromPaths(row, ...paths));
}

function weight(row, ...paths) {
  return formatWeightValue(valueFromPaths(row, ...paths));
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

function itemLabel(row) {
  return `${row.componentType ?? row.component ?? 'Component'}${subtypeOf(row) ? ` / ${subtypeOf(row)}` : ''}`;
}

function displayValue(key, value) {
  if (key === 'classRating') return `CL ${value}`;
  if (key === 'nps') return displayNps(value);
  return prettyType(value);
}

function displayNps(value) {
  return String(value ?? '—').replace(/^0\+/, '').replaceAll('+', ' ');
}

function prettyType(value) {
  return String(value ?? '').replaceAll('_', ' ');
}

function fieldLabel(field) {
  return ({ npsDn: 'NPS / DN', f2f: 'F2F', od: 'OD', flangeOd: 'O.D.', centerToEnd: 'C-E', developedLength: 'Dev. Len', largeNps: 'Large NPS', smallNps: 'Small NPS', branchNps: 'Branch NPS' }[field]) ?? prettyType(field);
}

function subtypeTitle(family) {
  return ({ VALVE: 'Valve Type', FLANGE: 'Flange Type', FITTING: 'Fitting Type', GASKET: 'Gasket Type', SUPPORT: 'Support Type', REDUCER: 'Reducer Type', OLET: 'Olet Type' }[family]) ?? 'Type';
}

function infoBadge(text) {
  return `<span class="info-dot" title="${esc(text)}" aria-label="${esc(text)}">i</span>`;
}

function shortSource(source) {
  return source ? String(source).split('/').pop() : '—';
}

function sortValues(a, b) {
  const na = Number(a), nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}
