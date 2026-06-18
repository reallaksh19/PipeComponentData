import { COMPONENTS, VALVE_TYPES, END_TYPES, FACINGS, CLASSES } from './data.js';
import { renderPipeSpecInspector } from './pipespecInspector.js';
import { iconSvg, pipeSpanSvg } from './svg.js';
import { renderPipeSpanInputs, renderPipeSpanMain } from './pipeSpan/ui.js';

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmt = (value, suffix = '') => value == null ? '—' : `${value}${suffix}`;

export function renderTabs(state, onSelect) {
  const host = document.getElementById('module-tabs');
  host.innerHTML = state.modules.map((name) =>
    `<button class="tab-btn ${name === state.activeModule ? 'active' : ''}" data-module="${esc(name)}">${esc(name)}</button>`
  ).join('');
  host.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => onSelect(button.dataset.module)));
}

export function renderDashboards(state, actions) {
  const host = document.getElementById('dashboard-zone');
  if (state.activeModule === 'Pipe Span') return renderPipeSpanInputs(host, state, actions);
  if (state.activeModule === '2D Bundle Calc') return renderBundleInfo(host);
  const cards = COMPONENTS.map((item) => card(item.key, item.label, item.count || '', state.filters.component === item.key)).join('');
  const valves = VALVE_TYPES.map((type) => card(type, type, '', state.filters.valveType === type)).join('');
  host.innerHTML = `${searchStrip(state)}${strip('Components', cards)}${strip('Valve Type', valves)}${configStrip(state)}`;
  host.querySelectorAll('[data-card]').forEach((button) => actions.setFilter(button.dataset.group, button.dataset.card));
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
  return `<section class="strip"><div class="strip-title">Search</div><div class="segment-row">
    <span class="chip">${esc(state.search.query)}</span>${chips}<span class="chip">${esc(state.search.matchType)}</span>
  </div></section>`;
}

function configStrip(state) {
  const group = (label, key, list) => `<span class="segment-label">${label}</span>` + list.map((item) =>
    `<button class="seg-btn ${state.filters[key] === item ? 'active' : ''}" data-group="${key}" data-card="${item}">${item}</button>`
  ).join('');
  return `<section class="strip"><div class="strip-title">Configuration</div><div class="segment-row">
    ${group('End', 'endType', END_TYPES)}${group('Facing', 'facing', FACINGS)}${group('Class', 'classRating', CLASSES)}
  </div></section>`;
}

function strip(title, html) {
  return `<section class="strip"><div class="strip-title">${title}</div><div class="card-row">${html}</div></section>`;
}

function card(key, label, count, active) {
  const group = COMPONENTS.some((item) => item.key === key) ? 'component' : 'valveType';
  return `<button class="card-btn ${active ? 'active' : ''}" data-group="${group}" data-card="${esc(key)}">${iconSvg(key)}<strong>${esc(label)}</strong><small>${esc(count)}</small></button>`;
}

export function renderMain(state, actions) {
  if (state.activeModule === 'Pipe Span') return renderPipeSpanMain(state, pipeSpanSvg);
  if (state.activeModule === '2D Bundle Calc') return renderBundle();
  renderPipeSpecTable(state, actions);
}

function renderPipeSpecTable(state, actions) {
  document.getElementById('table-title').textContent = 'PipeSpec DB';
  document.getElementById('table-kicker').textContent = state.search ? 'Search-ranked component data' : 'Dashboard-filtered component data';
  document.getElementById('table-count').textContent = `${state.rows.length} rows`;
  document.getElementById('table-frame').innerHTML = `<table><thead><tr><th>Type</th><th>End</th><th>Facing</th><th>NPS / DN</th><th>Class</th><th>F2F</th><th>Height</th><th>Weight</th><th>Status</th></tr></thead><tbody>${state.rows.map((row) => rowHtml(row, state.selectedId)).join('')}</tbody></table>`;
  document.querySelectorAll('[data-row-id]').forEach((row) => row.addEventListener('click', () => actions.selectRow(row.dataset.rowId)));
  document.getElementById('inspector-body').innerHTML = renderPipeSpecInspector(state.selectedRow);
}

function rowHtml(row, selectedId) {
  const d = row.dimensions ?? {}, w = row.weights ?? {};
  return `<tr class="${row.id === selectedId ? 'selected' : ''}" data-row-id="${esc(row.id)}"><td>${esc(row.valveType ?? row.componentType)}</td><td>${esc(row.endType)}</td><td>${esc(row.facing)}</td><td>NPS ${esc(row.nps)} / DN ${esc(row.dn)}</td><td>CL ${esc(row.classRating)}</td><td>${fmt(d.faceToFaceRfMm?.value, ' mm')}</td><td>${fmt(d.heightMm?.value, ' mm')}</td><td>${fmt(w.rfRtjKg?.value, ' kg')}</td><td class="status">${esc(row.dataStatus)}</td></tr>`;
}

function renderBundle() {
  document.getElementById('table-title').textContent = '2D Bundle Calc';
  document.getElementById('table-count').textContent = 'iframe';
  document.getElementById('table-frame').innerHTML = '<iframe class="bundle-frame" src="../spl2-bundle/spl2_master.html" title="SPL2 2D Calc Bundle"></iframe>';
  document.getElementById('inspector-body').innerHTML = '<p>Legacy bundle is isolated. No shared state is mixed with PipeTools modules yet.</p>';
}