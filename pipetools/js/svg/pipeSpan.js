import { escapeSvgText, formatDimension, svgCard, svgEl } from './safe.js';

const N = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function pipeSpanSvg(result = {}) {
  const row = result.row ?? {};
  const span = N(result.governingSpanM, 0);
  const qms = result.qmsReferenceM ?? null;
  const od = N(row.odMm, 114.3);
  const wall = N(row.wallMm, 6.02);
  const pipeWeight = result.totalWeightNPerM ?? result.pipeWeightNPerM;
  const method = result.input?.beamMethod ?? 'CONTINUOUS';
  const spanText = formatDimension(span, 'm');
  const qmsText = qms == null ? '---' : formatDimension(qms, 'm');
  const loadText = formatDimension(pipeWeight, 'N/m');
  const wallText = formatDimension(wall, 'mm');
  const odText = formatDimension(od, 'mm');

  const defs = `<defs>
    <marker id="psArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#38bdf8"/></marker>
    <marker id="psArrowStart" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z" fill="#38bdf8"/></marker>
    <pattern id="psHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#7BA7CC" stroke-width="1"/></pattern>
  </defs>`;
  const bg = svgEl('rect', { width: 520, height: 300, rx: 14, fill: '#f8fafc', stroke: '#dbeafe' });
  const title = svgEl('text', { x: 260, y: 24, 'text-anchor': 'middle', fill: '#0f172a', 'font-size': 14, 'font-weight': 700 }, 'Pipe Span Engineering Sketch');
  const sub = svgEl('text', { x: 260, y: 42, 'text-anchor': 'middle', fill: '#64748b', 'font-size': 10 }, `NPS ${escapeSvgText(result.input?.nps)} · ${escapeSvgText(result.input?.schedule)} · ${escapeSvgText(method)}`);
  const center = svgEl('line', { x1: 70, y1: 130, x2: 450, y2: 130, stroke: '#94a3b8', 'stroke-dasharray': '8 4 2 4' });
  const pipe = svgEl('rect', { x: 72, y: 108, width: 376, height: 44, rx: 22, fill: '#dbeafe', stroke: '#1e293b', 'stroke-width': 2 });
  const boreTop = svgEl('line', { x1: 82, y1: 120, x2: 438, y2: 120, stroke: '#475569', 'stroke-dasharray': '6 4' });
  const boreBot = svgEl('line', { x1: 82, y1: 140, x2: 438, y2: 140, stroke: '#475569', 'stroke-dasharray': '6 4' });
  const hatchA = svgEl('rect', { x: 72, y: 108, width: 34, height: 44, rx: 18, fill: 'url(#psHatch)', opacity: .72 });
  const hatchB = svgEl('rect', { x: 414, y: 108, width: 34, height: 44, rx: 18, fill: 'url(#psHatch)', opacity: .72 });
  const leftSupport = support(92, 156, 'S1');
  const rightSupport = support(428, 156, 'S2');
  const dim = dimension(92, 206, 428, 206, `Governing span ${spanText}`);
  const qmsDim = dimension(122, 232, 398, 232, `QMS ref ${qmsText}`);
  const loads = [160, 220, 280, 340].map((x) => loadArrow(x, 70, 102)).join('');
  const labels = [
    callout(122, 107, 70, 78, `OD ${odText}`),
    callout(400, 119, 454, 92, `Wall ${wallText}`),
    callout(260, 70, 305, 62, `Load ${loadText}`),
    svgEl('text', { x: 260, y: 280, 'text-anchor': 'middle', fill: '#475569', 'font-size': 10 }, 'Deflection/stress method comparison shown in result table; SVG uses governing value.'),
  ].join('');
  return svgCard(defs + bg + title + sub + center + pipe + hatchA + hatchB + boreTop + boreBot + loads + leftSupport + rightSupport + dim + qmsDim + labels, 'Pipe span engineering sketch', '0 0 520 300');
}

function support(x, y, label) {
  return `${svgEl('path', { d: `M${x - 22},${y + 40} L${x},${y} L${x + 22},${y + 40} Z`, fill: '#e0f2fe', stroke: '#0f172a', 'stroke-width': 1.4 })}
    ${svgEl('rect', { x: x - 28, y: y + 40, width: 56, height: 10, rx: 3, fill: '#cbd5e1', stroke: '#0f172a' })}
    ${svgEl('text', { x, y: y + 58, 'text-anchor': 'middle', fill: '#334155', 'font-size': 10, 'font-weight': 700 }, label)}`;
}

function dimension(x1, y1, x2, y2, text) {
  return `${svgEl('line', { x1, y1: y1 - 7, x2: x1, y2: y1 + 7, stroke: '#38bdf8' })}
    ${svgEl('line', { x1: x2, y1: y2 - 7, x2, y2: y2 + 7, stroke: '#38bdf8' })}
    ${svgEl('line', { x1: x1 + 8, y1, x2: x2 - 8, y2, stroke: '#38bdf8', 'stroke-width': 1.5, 'marker-start': 'url(#psArrowStart)', 'marker-end': 'url(#psArrow)' })}
    ${svgEl('text', { x: (x1 + x2) / 2, y: y1 - 9, 'text-anchor': 'middle', fill: '#0369a1', 'font-size': 11, 'font-weight': 700 }, text)}`;
}

function loadArrow(x, y1, y2) {
  return `${svgEl('line', { x1: x, y1, x2: x, y2, stroke: '#fb7185', 'stroke-width': 1.5, 'marker-end': 'url(#psArrow)' })}
    ${svgEl('text', { x, y: y1 - 6, 'text-anchor': 'middle', fill: '#be123c', 'font-size': 9 }, 'w')}`;
}

function callout(x, y, tx, ty, text) {
  return `${svgEl('circle', { cx: x, cy: y, r: 3, fill: '#38bdf8' })}
    ${svgEl('polyline', { points: `${x},${y} ${tx},${ty} ${tx + 42},${ty}`, fill: 'none', stroke: '#38bdf8', 'stroke-width': 1 })}
    ${svgEl('text', { x: tx + 46, y: ty + 4, fill: '#0369a1', 'font-size': 10, 'font-weight': 700 }, text)}`;
}