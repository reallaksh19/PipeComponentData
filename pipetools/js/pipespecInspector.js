import { dimensionFacts, firstDimensionText, firstWeightText, formatFact, weightFacts } from './dimensionDisplay.js';
import { getPipeSpecSvgKey, toPipeSpecSvgRow } from './svg/pipeSpecSvgEngine.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function renderPipeSpecInspector(row) {
  if (!row) return '<p>Select a table row to preview SVG and source-backed values.</p>';
  const svgRow = toPipeSpecSvgRow(row);
  const svgKey = getPipeSpecSvgKey(row);
  return `${detailToolbar(row)}${tabBar()}${detailMetadata(row, svgRow, svgKey)}${jsonPanel(row)}`;
}

function detailToolbar(row) {
  return `<div class="detail-toolbar" data-detail-toolbar="true">
    <button class="detail-icon-btn" type="button" data-detail-action="tab-details" title="Detailed metadata"><span>Detailed View</span></button>
    <button class="detail-icon-btn" type="button" data-detail-action="copy-json" title="Copy row JSON"><span>Copy JSON</span></button>
    <button class="detail-icon-btn" type="button" data-detail-action="open-svg-preview" title="Open centre SVG preview"><span>SVG Preview</span></button>
    <small class="detail-action-status" data-detail-status>${esc(itemLabel(row))}</small>
  </div>`;
}

function tabBar() {
  return `<div class="inspector-tabs" role="tablist" aria-label="Inspector views">
    <button class="inspector-tab active" type="button" data-detail-action="tab-details" data-tab-target="details">Details</button>
    <button class="inspector-tab" type="button" data-detail-action="tab-json" data-tab-target="json">JSON</button>
  </div>`;
}

function detailMetadata(row, svgRow, svgKey) {
  return `<section class="detail-metadata details-grid" data-detail-metadata="true" data-inspector-panel="details">
    ${kv('Item', itemLabel(row))}
    ${kv('SVG Route', svgKey)}
    ${kv('End / Facing', `${row.endType ?? row.endConnection ?? svgRow.endType ?? '—'} ${row.facing ?? svgRow.facing ?? ''}`.trim())}
    ${kv('Size', `NPS ${row.nps ?? row.largeNps ?? '—'} / DN ${row.dn ?? '—'}`)}
    ${kv('Class', classText(row, svgRow))}
    ${kv('Primary Dim.', firstDimensionText(row))}
    ${kv('Weight', firstWeightText(row))}
    ${kv('Source', shortSource(row.source))}
    ${kv('Status', row.dataStatus ?? row.provenance?.dataStatus ?? '—')}
    ${kv('Standard', row.standard ?? svgRow.standard ?? '—')}
    ${factRows('Dimensions', dimensionFacts(row))}
    ${factRows('Weights', weightFacts(row))}
  </section>`;
}

function jsonPanel(row) {
  return `<section class="detail-json-panel" data-detail-json="true" data-inspector-panel="json" hidden>
    <pre>${esc(JSON.stringify(row, null, 2))}</pre>
  </section>`;
}

function itemLabel(row) {
  const component = row.componentType ?? row.component ?? 'Component';
  const type = row.valveType ?? row.flangeType ?? row.fittingType ?? row.reducerType ?? row.oletType ?? row.subtype ?? row.supportKind ?? row.type ?? null;
  return type ? `${component} / ${type}` : String(component);
}

function classText(row, svgRow) {
  const rating = row.classRating ?? svgRow.classRating;
  return rating ? `CL ${String(rating).replace(/^CL\s*/i, '')}` : '—';
}

function factRows(title, facts) {
  if (!facts.length) return kv(title, 'No source-backed values in row');
  return `${sectionHeader(title)}${facts.map((fact) => kv(fact.label, formatFact(fact))).join('')}`;
}

function sectionHeader(title) {
  return `<div class="detail-row detail-section"><span>${esc(title)}</span><strong>Source row</strong></div>`;
}

function shortSource(source) {
  return source ? String(source).split('/').pop() : '—';
}

function kv(label, value) {
  return `<div class="detail-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}
