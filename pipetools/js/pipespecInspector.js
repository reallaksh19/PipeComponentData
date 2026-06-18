import { resolveInspectorSvg } from './pipespecAdapters.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function renderPipeSpecInspector(row, options = {}) {
  if (!row) return '<p>Select a table row to preview SVG and source-backed values.</p>';
  const d = row.dimensions ?? {};
  const w = row.weights ?? {};
  return `${resolveInspectorSvg(row, options)}${kv('Item', itemLabel(row))}${kv('End / Facing', `${row.endType ?? row.endConnection ?? '—'} ${row.facing ?? ''}`.trim())}${kv('Size', `NPS ${row.nps ?? '—'} / DN ${row.dn ?? '—'}`)}${kv('Class', `CL ${row.classRating ?? '—'}`)}${kv('F2F RF', val(d.faceToFaceRfMm, 'mm'))}${kv('F2F RTJ', val(d.faceToFaceRtjMm, 'mm'))}${kv('Height', val(d.heightMm, 'mm'))}${kv('Weight', val(w.rfRtjKg, 'kg'))}`;
}

function itemLabel(row) {
  const type = row.valveType ?? row.flangeType ?? row.fittingType ?? row.subtype ?? row.componentType ?? 'Component';
  return `${type} ${row.componentType ?? ''}`.trim();
}

function kv(label, value) {
  return `<div class="kv"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}

function val(item, suffix) {
  const raw = item?.value ?? item;
  return raw == null || raw === '' ? '—' : `${raw} ${suffix}`;
}
