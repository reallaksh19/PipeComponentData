import { hasPipeSpecSvgSupport, toPipeSpecSvgRow } from './svg/pipeSpecSvgEngine.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function renderPipeSpecInspector(row) {
  if (!row) return '<p>Select a table row to preview SVG and source-backed values.</p>';
  const svgRow = toPipeSpecSvgRow(row);
  return `${detailToolbar(row)}${svgPanel(row, svgRow)}${detailMetadata(row, svgRow)}${jsonPanel(row)}`;
}

function detailToolbar(row) {
  return `<div class="detail-toolbar" data-detail-toolbar="true">
    <button class="detail-icon-btn" type="button" data-detail-action="toggle-json" aria-expanded="false" title="Detailed View">▦ <span>Detailed View</span></button>
    <button class="detail-icon-btn" type="button" data-detail-action="copy-json" title="Copy row JSON">⧉ <span>Copy JSON</span></button>
    <button class="detail-icon-btn" type="button" data-detail-action="open-svg-preview" title="Open SVG preview">↗ <span>SVG Preview</span></button>
    <small class="detail-action-status" data-detail-status>${esc(itemLabel(row))}</small>
  </div>`;
}

function svgPanel(row, svgRow) {
  if (!hasPipeSpecSvgSupport(row)) {
    return '<div class="svg-card svg-unavailable">SVG not available for this component/type. No fallback renderer used.</div>';
  }
  return `<div class="svg-card source-svg-card"><div class="source-svg-label">Source SVG</div><div data-pipespec-svg-host="true" data-row-id="${esc(row.id)}" data-component-type="${esc(svgRow.componentType)}"><div class="svg-loading">Loading source SVG…</div></div></div>`;
}

function detailMetadata(row, svgRow) {
  return `<section class="detail-metadata" data-detail-metadata="true">
    ${kv('Item', itemLabel(row))}
    ${kv('SVG Route', svgRoute(svgRow))}
    ${kv('End / Facing', `${row.endType ?? row.endConnection ?? svgRow.endType ?? '—'} ${row.facing ?? svgRow.facing ?? ''}`.trim())}
    ${kv('Size', `NPS ${row.nps ?? '—'} / DN ${row.dn ?? '—'}`)}
    ${kv('Class', classText(row, svgRow))}
    ${kv('Primary Dim.', primaryDimension(row, svgRow))}
    ${kv('Weight', weightText(row, svgRow))}
    ${kv('Source', shortSource(row.source))}
  </section>`;
}

function jsonPanel(row) {
  return `<details class="detail-json-panel" data-detail-json="true">
    <summary>Normalized Row JSON</summary>
    <pre>${esc(JSON.stringify(row, null, 2))}</pre>
  </details>`;
}

function itemLabel(row) {
  const type = row.valveType ?? row.flangeType ?? row.fittingType ?? row.subtype ?? row.componentType ?? 'Component';
  return `${type} ${row.componentType ?? ''}`.trim();
}

function svgRoute(svgRow) {
  return [svgRow.componentType, svgRow.valveType ?? svgRow.flangeType ?? svgRow.fittingType ?? svgRow.gasketType ?? svgRow.subtype ?? svgRow.schedule].filter(Boolean).join(' / ');
}

function classText(row, svgRow) {
  const rating = row.classRating ?? svgRow.classRating;
  return rating ? `CL ${String(rating).replace(/^CL\s*/i, '')}` : '—';
}

function primaryDimension(row, svgRow) {
  const d = row.dimensions ?? {};
  const items = [
    ['OD', svgRow.odMm ?? d.odMm?.value, 'mm'],
    ['F2F', svgRow.faceToFaceRfMm ?? d.faceToFaceRfMm?.value, 'mm'],
    ['C-E', svgRow.ctrToEndMm ?? d.centerToEndMm?.value, 'mm'],
    ['O.Dia', svgRow.flangeOdMm ?? svgRow.outerDiaMm ?? d.flangeOdMm?.value ?? d.outerDiaMm?.value, 'mm'],
  ];
  const hit = items.find(([, value]) => value != null && value !== '');
  return hit ? `${hit[0]} ${hit[1]} ${hit[2]}` : '—';
}

function weightText(row, svgRow) {
  const w = row.weights ?? {};
  const value = svgRow.weightKg ?? svgRow.rfRtjKg ?? svgRow.weightKgPerM ?? w.weightKg?.value ?? w.rfRtjKg?.value ?? w.weightKgPerM?.value;
  if (value == null || value === '') return '—';
  return svgRow.weightKgPerM ? `${value} kg/m` : `${value} kg`;
}

function shortSource(source) {
  return source ? String(source).split('/').pop() : '—';
}

function kv(label, value) {
  return `<div class="kv"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}
