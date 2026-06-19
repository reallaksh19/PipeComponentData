import { basePanel, centerLine, escapeSvgText, formatDimension, svgCard, svgEl } from './safe.js';

function labeledPreview(label, body, row = {}) {
  const rawNps = row.nps ? `NPS ${row.nps}` : 'Reference';
  const text = `${escapeSvgText(label)} · ${escapeSvgText(rawNps)}`;
  const caption = svgEl('text', { x: 210, y: 224, fill: '#e0f2fe', 'text-anchor': 'middle', 'font-size': 15 }, text);
  return svgCard(`${basePanel()}${centerLine(130)}${body}${caption}`, label);
}

function path(d, stroke = '#e5f0ff', width = 3, extra = {}) {
  return svgEl('path', { d, fill: 'none', stroke, 'stroke-width': width, ...extra });
}

function circle(cx, cy, r, stroke = '#7dd3fc', extra = {}) {
  return svgEl('circle', { cx, cy, r, fill: 'none', stroke, 'stroke-width': 3, ...extra });
}

export function renderPipeStraight(row = {}) {
  const od = row.odMm ?? row.outerDiameterMm;
  const pipe = path('M62 112h296', '#e5f0ff', 34, { 'stroke-linecap': 'round' });
  const line = path('M62 112h296', '#7dd3fc', 3, { 'stroke-linecap': 'round' });
  const text = svgEl('text', { x: 210, y: 205, fill: '#e0f2fe', 'text-anchor': 'middle', 'font-size': 15 }, `Pipe OD ${formatDimension(od)}`);
  return svgCard(`${basePanel()}${pipe}${line}${text}`, 'Straight pipe technical preview');
}

export function renderFlangeWnRf(row = {}) {
  const body = path('M120 70h34v120h-34zM154 92l92 38-92 38M246 88h42v84h-42') + circle(288, 130, 48);
  return labeledPreview('WN Flange RF', body, row);
}

export function renderFlangeWnRtj(row = {}) {
  const body = path('M120 70h34v120h-34zM154 92l92 38-92 38M246 88h42v84h-42') + circle(288, 130, 48) + circle(288, 130, 30, '#38bdf8', { 'stroke-dasharray': '4 3' });
  return labeledPreview('WN Flange RTJ', body, row);
}

export function renderFlangeBlindRf(row = {}) {
  const body = circle(210, 130, 66, '#e5f0ff', { 'stroke-width': 4 }) + circle(210, 130, 36) + path('M210 64v22M210 174v22M144 130h22M254 130h22', '#38bdf8');
  return labeledPreview('Blind Flange RF', body, row);
}

export function renderElbow90Lr(row = {}) {
  const body = path('M105 172h92a94 94 0 0 0 94-94V50', '#e5f0ff', 28, { 'stroke-linecap': 'round' }) + path('M105 172h92a94 94 0 0 0 94-94V50', '#7dd3fc', 3);
  return labeledPreview('90° LR Elbow', body, row);
}

export function renderTeeEqual(row = {}) {
  const body = path('M92 132h236M210 132V54', '#e5f0ff', 30, { 'stroke-linecap': 'round' }) + path('M92 132h236M210 132V54', '#7dd3fc', 3);
  return labeledPreview('Equal Tee', body, row);
}

export function renderSupportGuide(row = {}) {
  const body = path('M96 104h228', '#e5f0ff', 22, { 'stroke-linecap': 'round' }) + path('M138 156h144M164 156V96M256 156V96M134 186h152', '#7dd3fc', 5, { 'stroke-linecap': 'round' });
  return labeledPreview('Guide Support', body, row);
}

export function renderLineStop(row = {}) {
  const body = path('M96 104h228', '#e5f0ff', 22, { 'stroke-linecap': 'round' }) + path('M138 156h144M210 156V86M176 104h68M134 186h152', '#7dd3fc', 5, { 'stroke-linecap': 'round' });
  return labeledPreview('Line Stop', body, row);
}

export function renderFallback(row = {}) {
  const key = row.svgKey ?? 'unresolved';
  const box = svgEl('rect', { x: 130, y: 72, width: 160, height: 96, rx: 14, fill: 'none', stroke: '#facc15', 'stroke-width': 3, 'stroke-dasharray': '7 5' });
  const mark = path('M210 96v38M210 152v4', '#facc15', 6, { 'stroke-linecap': 'round' });
  return labeledPreview('SVG not available', box + mark, { nps: key });
}
