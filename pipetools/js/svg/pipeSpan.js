import { basePanel, formatDimension, svgCard, svgEl } from './safe.js';

export function pipeSpanSvg(result = {}) {
  const value = formatDimension(result?.governingSpanM, 'm');
  const pipe = svgEl('line', { x1: 55, y1: 78, x2: 365, y2: 78, stroke: '#e5f0ff', 'stroke-width': 18, 'stroke-linecap': 'round' });
  const left = svgEl('line', { x1: 72, y1: 96, x2: 72, y2: 140, stroke: '#7dd3fc', 'stroke-width': 4, 'stroke-linecap': 'round' });
  const right = svgEl('line', { x1: 348, y1: 96, x2: 348, y2: 140, stroke: '#7dd3fc', 'stroke-width': 4, 'stroke-linecap': 'round' });
  const dim = svgEl('line', { x1: 72, y1: 150, x2: 348, y2: 150, stroke: '#38bdf8', 'stroke-width': 2 });
  const text = svgEl('text', { x: 210, y: 168, fill: '#e0f2fe', 'text-anchor': 'middle', 'font-size': 16 }, 'Governing span ' + value);
  return svgCard(basePanel(420, 180) + pipe + left + right + dim + text, 'Pipe span preview', '0 0 420 180');
}
