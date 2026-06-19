import { escapeSvgText, formatDimension, svgCard, svgEl } from './safe.js';

const ink = '#1e293b';
const dim = '#2563eb';
const fill = '#eff6ff';
const hatch = '#dbeafe';
const muted = '#94a3b8';
const mono = 'monospace';

function panel(w = 390, h = 262) {
  return svgEl('rect', { width: w, height: h, fill: '#f8fafc' })
    + svgEl('rect', { width: w, height: h, fill: 'none', stroke: '#e2e8f0' });
}

function title(text, y = 255) {
  return svgEl('rect', { x: 0, y: y - 18, width: 390, height: 18, fill: '#f1f5f9' })
    + svgEl('text', { x: 195, y: y - 6, 'text-anchor': 'middle', fill: '#64748b', 'font-size': 8, 'font-family': mono }, escapeSvgText(text));
}

function center(x1, y1, x2, y2) {
  return svgEl('line', { x1, y1, x2, y2, stroke: muted, 'stroke-width': .8, 'stroke-dasharray': '9,3,2,3' });
}

function hdim(x1, x2, y, text) {
  return svgEl('line', { x1, y1: y, x2, y2: y, stroke: dim, 'stroke-width': 1 })
    + svgEl('line', { x1, y1: y - 6, x2: x1, y2: y + 6, stroke: dim })
    + svgEl('line', { x1: x2, y1: y - 6, x2, y2: y + 6, stroke: dim })
    + svgEl('text', { x: (x1 + x2) / 2, y: y + 14, 'text-anchor': 'middle', fill: dim, 'font-size': 9, 'font-family': mono }, escapeSvgText(text));
}

function vdim(x, y1, y2, text) {
  return svgEl('line', { x1: x, y1, x2: x, y2, stroke: dim, 'stroke-width': 1 })
    + svgEl('line', { x1: x - 6, y1, x2: x + 6, y2: y1, stroke: dim })
    + svgEl('line', { x1: x - 6, y1: y2, x2: x + 6, y2, stroke: dim })
    + svgEl('text', { x: x + 15, y: (y1 + y2) / 2, fill: dim, 'font-size': 9, 'font-family': mono, transform: `rotate(-90 ${x + 15} ${(y1 + y2) / 2})` }, escapeSvgText(text));
}

function label(x, y, text) {
  return svgEl('text', { x, y, fill: dim, 'font-size': 9, 'font-family': mono, 'font-weight': 600 }, escapeSvgText(text));
}

function card(body, labelText, viewBox = '0 0 390 262') {
  return svgCard(body, escapeSvgText(labelText), viewBox);
}

export function renderAuditPipe(row = {}) {
  const od = row.odMm ?? row.outerDiameterMm ?? row.dimensions?.odMm?.value;
  const wall = row.wallMm ?? row.dimensions?.wallMm?.value;
  const id = row.idMm ?? (od && wall ? od - (2 * wall) : null);
  const schedule = row.schedule ?? row.sch ?? '—';
  const cx = 82, cy = 122, outer = 58, inner = Math.max(24, outer * Number(id ?? 80) / Number(od ?? 114));
  const length = svgEl('rect', { x: 150, y: cy - outer, width: 190, height: outer * 2, fill, stroke: ink, 'stroke-width': 1.4 })
    + svgEl('line', { x1: 150, y1: cy - inner, x2: 340, y2: cy - inner, stroke: ink, 'stroke-dasharray': '5,3' })
    + svgEl('line', { x1: 150, y1: cy + inner, x2: 340, y2: cy + inner, stroke: ink, 'stroke-dasharray': '5,3' });
  const end = svgEl('circle', { cx, cy, r: outer, fill, stroke: ink, 'stroke-width': 1.5 })
    + svgEl('circle', { cx, cy, r: inner, fill: '#f8fafc', stroke: ink, 'stroke-width': 1.2 });
  const body = panel() + center(20, cy, 365, cy) + end + length
    + hdim(cx - outer, cx + outer, cy + outer + 18, `OD ${formatDimension(od)}`)
    + hdim(cx - inner, cx + inner, cy - inner - 14, `ID ${formatDimension(id)}`)
    + label(190, 204, `SCH ${schedule} · ${formatDimension(row.weightKgPerM, 'kg/m')}`)
    + title(`PIPE · NPS ${row.nps ?? '—'} · DN ${row.dn ?? '—'}`);
  return card(body, 'Pipe technical section');
}

export function renderAuditElbow90(row = {}) {
  const od = row.odMm ?? 114.3;
  const a = row.ctrToEndMm ?? row.dimensions?.ctrToEndMm?.value;
  const w = row.weightKg;
  const body = panel() + center(68, 170, 286, 50)
    + svgEl('path', { d: 'M78 172h90a92 92 0 0 0 92-92V46', fill: 'none', stroke: fill, 'stroke-width': 34, 'stroke-linecap': 'round' })
    + svgEl('path', { d: 'M78 172h90a92 92 0 0 0 92-92V46', fill: 'none', stroke: ink, 'stroke-width': 2 })
    + hdim(78, 172, 212, `A ${formatDimension(a)}`)
    + vdim(300, 50, 172, `B ${formatDimension(a)}`)
    + label(90, 140, `OD ${formatDimension(od)}`)
    + label(245, 80, formatDimension(w, 'kg'))
    + title(`90° LR ELBOW · NPS ${row.nps ?? '—'} · SCH ${row.schedule ?? '—'}`);
  return card(body, '90 degree elbow technical preview');
}

export function renderAuditTee(row = {}) {
  const od = row.odMm ?? 114.3;
  const a = row.ctrToEndMm;
  const body = panel() + center(60, 142, 330, 142) + center(195, 45, 195, 205)
    + svgEl('path', { d: 'M62 112h266v60H62zM165 52h60v90h-60z', fill, stroke: ink, 'stroke-width': 1.5 })
    + hdim(62, 328, 205, `Run ${formatDimension(a ? a * 2 : null)}`)
    + vdim(250, 52, 142, `Branch ${formatDimension(a)}`)
    + label(252, 120, `OD ${formatDimension(od)}`)
    + label(276, 155, formatDimension(row.weightKg, 'kg'))
    + title(`STRAIGHT TEE · NPS ${row.nps ?? '—'} · SCH ${row.schedule ?? '—'}`);
  return card(body, 'Tee technical preview');
}

export function renderAuditCap(row = {}) {
  const od = row.odMm ?? 114.3;
  const length = row.overCapMm ?? row.dimensions?.overCapMm?.value;
  const body = panel() + center(80, 132, 310, 132)
    + svgEl('path', { d: 'M118 76h122a42 56 0 0 1 0 112H118z', fill, stroke: ink, 'stroke-width': 1.5 })
    + svgEl('path', { d: 'M118 76h10v112h-10z', fill: hatch, stroke: ink })
    + hdim(118, 282, 210, `L ${formatDimension(length)}`)
    + vdim(94, 76, 188, `OD ${formatDimension(od)}`)
    + label(210, 86, formatDimension(row.weightKg, 'kg'))
    + title(`CAP · NPS ${row.nps ?? '—'} · SCH ${row.schedule ?? '—'}`);
  return card(body, 'Cap technical preview');
}
