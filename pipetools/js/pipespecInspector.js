import { getPipeSpecSvgKey, hasPipeSpecSvgSupport, toPipeSpecSvgRow } from './svg/pipeSpecSvgEngine.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function renderPipeSpecInspector(row) {
  if (!row) return '<p>Select a table row to preview SVG and source-backed values.</p>';
  const svgRow = toPipeSpecSvgRow(row);
  const svgKey = getPipeSpecSvgKey(row);
  return `${detailToolbar(row)}${tabBar()}${svgPanel(row, svgRow)}${detailMetadata(row, svgRow, svgKey)}${jsonPanel(row)}`;
}

function detailToolbar(row) {
  return `<div class="detail-toolbar" data-detail-toolbar="true">
    <button class="detail-icon-btn" type="button" data-detail-action="svg-zoom-in" title="Zoom in">＋</button>
    <button class="detail-icon-btn" type="button" data-detail-action="svg-zoom-out" title="Zoom out">－</button>
    <button class="detail-icon-btn" type="button" data-detail-action="svg-fit" title="Fit SVG">Fit</button>
    <button class="detail-icon-btn" type="button" data-detail-action="open-svg-preview" title="Open SVG preview">⛶</button>
    <button class="detail-icon-btn" type="button" data-detail-action="copy-json" title="Copy row JSON">⧉ <span>Copy JSON</span></button>
    <small class="detail-action-status" data-detail-status>${esc(itemLabel(row))}</small>
  </div>`;
}

function tabBar() {
  return `<div class="inspector-tabs" role="tablist" aria-label="Inspector views">
    <button class="inspector-tab active" type="button" data-detail-action="tab-svg" data-tab-target="svg">SVG</button>
    <button class="inspector-tab" type="button" data-detail-action="tab-details" data-tab-target="details">Details</button>
    <button class="inspector-tab" type="button" data-detail-action="tab-json" data-tab-target="json">JSON</button>
  </div>`;
}

function svgPanel(row, svgRow) {
  if (!hasPipeSpecSvgSupport(row)) {
    return `<div class="svg-card source-svg-card svg-canvas" data-inspector-panel="svg">
      <div class="svg-unavailable">SVG not available for ${esc(row.componentType ?? row.component ?? 'this component')}. No fallback renderer used.</div>
    </div>`;
  }
  return `<div class="svg-card source-svg-card svg-canvas" data-inspector-panel="svg">
    <div data-pipespec-svg-host="true" data-row-id="${esc(row.id)}" data-component-type="${esc(svgRow.componentType)}"><div class="svg-loading">Loading source SVG…</div></div>
  </div>`;
}

function detailMetadata(row, svgRow, svgKey) {
  return `<section class="detail-metadata details-grid" data-detail-metadata="true" data-inspector-panel="details">
    ${kv('Item', itemLabel(row))}
    ${kv('SVG Key', svgKey)}
    ${kv('End / Facing', `${row.endType ?? row.endConnection ?? svgRow.endType ?? '—'} ${row.facing ?? svgRow.facing ?? ''}`.trim())}
    ${kv('Size', `NPS ${row.nps ?? row.largeNps ?? '—'} / DN ${row.dn ?? '—'}`)}
    ${kv('Class', classText(row, svgRow))}
    ${kv('Primary Dim.', primaryDimension(row, svgRow))}
    ${kv('Weight', weightText(row, svgRow))}
    ${kv('Source', shortSource(row.source))}
    ${kv('Status', row.dataStatus ?? row.provenance?.dataStatus ?? '—')}
    ${kv('Standard', row.standard ?? svgRow.standard ?? '—')}
  </section>`;
}

function jsonPanel(row) {
  return `<section class="detail-json-panel" data-detail-json="true" data-inspector-panel="json" hidden>
    <pre>${esc(JSON.stringify(row, null, 2))}</pre>
  </section>`;
}

function itemLabel(row) {
  const type = row.valveType ?? row.flangeType ?? row.fittingType ?? row.reducerType ?? row.oletType ?? row.subtype ?? row.componentType ?? 'Component';
  return `${pretty(type)} ${pretty(row.componentType ?? '')}`.trim();
}

function classText(row, svgRow) {
  const rating = row.classRating ?? svgRow.classRating;
  return rating ? `CL ${String(rating).replace(/^CL\s*/i, '')}` : '—';
}

function primaryDimension(row, svgRow) {
  const d = row.dimensions ?? {};
  const items = [
    ['F2F', svgRow.faceToFaceRfMm ?? d.faceToFaceRfMm?.value ?? d.faceToFaceMm?.value, 'mm'],
    ['Height', svgRow.heightMm ?? d.heightMm?.value, 'mm'],
    ['OD', svgRow.odMm ?? d.odMm?.value, 'mm'],
    ['O.Dia', svgRow.flangeOdMm ?? svgRow.outerDiaMm ?? d.flangeOdMm?.value ?? d.outerDiaMm?.value, 'mm'],
    ['C-E', svgRow.ctrToEndMm ?? d.centerToEndMm?.value, 'mm'],
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
  return `<div class="detail-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}

function pretty(value) {
  return String(value ?? '').replaceAll('_', ' ');
}