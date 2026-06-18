import { basePanel, centerLine, escapeSvgText, formatDimension, readValue, svgCard, svgEl } from './safe.js';

function valveMetrics(row, defaultFacing) {
  const dims = row?.dimensions ?? {};
  return {
    f2f: dims.faceToFaceRfMm?.value ?? dims.faceToFaceRtjMm?.value ?? row?.f2f,
    height: dims.heightMm?.value ?? row?.height,
    facing: row?.facing ?? defaultFacing,
  };
}

function valveBody() {
  return svgEl('path', { d: 'M86 98L170 138L86 178Z M334 98L250 138L334 178Z', fill: 'none', stroke: '#e5f0ff', 'stroke-width': 3 })
    + svgEl('path', { d: 'M184 112h52l18-42h-88z', fill: 'none', stroke: '#e5f0ff', 'stroke-width': 3 })
    + svgEl('line', { x1: 210, y1: 70, x2: 210, y2: 34, stroke: '#e5f0ff', 'stroke-width': 3 })
    + svgEl('circle', { cx: 210, cy: 30, r: 22, fill: 'none', stroke: '#7dd3fc', 'stroke-width': 3 })
    + svgEl('path', { d: 'M188 30h44M210 8v44', stroke: '#7dd3fc', 'stroke-width': 2, fill: 'none' });
}

function flanges() {
  return svgEl('rect', { x: 58, y: 96, width: 28, height: 84, rx: 5, fill: 'none', stroke: '#7dd3fc', 'stroke-width': 3 })
    + svgEl('rect', { x: 334, y: 96, width: 28, height: 84, rx: 5, fill: 'none', stroke: '#7dd3fc', 'stroke-width': 3 });
}

function buttweldEnds() {
  return svgEl('path', { d: 'M48 112h38M48 164h38M334 112h38M334 164h38', stroke: '#7dd3fc', 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none' });
}

function valveDimensions(metrics) {
  const safeFacing = escapeSvgText(metrics.facing ?? 'NA');
  return svgEl('line', { x1: 58, y1: 212, x2: 362, y2: 212, stroke: '#38bdf8', 'stroke-width': 2 })
    + svgEl('path', { d: 'M58 200v24M362 200v24', stroke: '#38bdf8', 'stroke-width': 2, fill: 'none' })
    + svgEl('text', { x: 210, y: 235, fill: '#e0f2fe', 'text-anchor': 'middle', 'font-size': 15 }, `F2F ${safeFacing}: ${formatDimension(metrics.f2f)}`)
    + svgEl('line', { x1: 392, y1: 30, x2: 392, y2: 180, stroke: '#38bdf8', 'stroke-width': 2 })
    + svgEl('path', { d: 'M380 30h24M380 180h24', stroke: '#38bdf8', 'stroke-width': 2, fill: 'none' })
    + svgEl('text', { x: 383, y: 112, fill: '#e0f2fe', 'font-size': 14, transform: 'rotate(-90 383 112)' }, `H ${formatDimension(metrics.height)}`);
}

function renderGate(row, options = {}) {
  const metrics = valveMetrics(row, options.facing ?? 'RF');
  const ends = metrics.facing === 'NA' ? buttweldEnds() : flanges();
  return svgCard(`${basePanel()}${centerLine()}${ends}${valveBody()}${valveDimensions(metrics)}`, 'Gate valve technical preview');
}

function renderCompactValve(row, label) {
  const height = readValue(row, ['dimensions', 'heightMm', 'value'], row?.height);
  const safeLabel = escapeSvgText(label);
  const body = flanges() + svgEl('ellipse', { cx: 210, cy: 138, rx: 112, ry: 48, fill: 'none', stroke: '#e5f0ff', 'stroke-width': 3 })
    + svgEl('path', { d: 'M160 138h100M210 90v-42', stroke: '#e5f0ff', 'stroke-width': 3, fill: 'none' })
    + svgEl('circle', { cx: 210, cy: 44, r: 20, fill: 'none', stroke: '#7dd3fc', 'stroke-width': 3 })
    + svgEl('text', { x: 210, y: 224, fill: '#e0f2fe', 'text-anchor': 'middle', 'font-size': 15 }, `${safeLabel} · H ${formatDimension(height)}`);
  return svgCard(`${basePanel()}${centerLine()}${body}`, `${label} valve technical preview`);
}

export const valveRenderers = {
  VALVE_GATE_FLANGED_RF: (row) => renderGate(row, { facing: 'RF' }),
  VALVE_GATE_FLANGED_RTJ: (row) => renderGate(row, { facing: 'RTJ' }),
  VALVE_GATE_BUTT_WELD_NA: (row) => renderGate({ ...row, facing: 'NA' }, { facing: 'NA' }),
  VALVE_GLOBE_FLANGED_RF: (row) => renderCompactValve(row, 'Globe'),
  VALVE_CHECK_FLANGED_RF: (row) => renderCompactValve(row, 'Check'),
};
