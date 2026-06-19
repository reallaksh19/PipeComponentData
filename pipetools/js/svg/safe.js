const ENTITY_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const BLOCKED_TOKENS = ['<' + 'script', '<' + 'foreignObject', 'on\\w+=', 'java' + 'script:'];
const UNSAFE_SVG_RE = new RegExp(BLOCKED_TOKENS.join('|'), 'i');

export function escapeSvgText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ENTITY_MAP[ch]);
}

export function formatDimension(value, suffix = 'mm') {
  if (value === null || value === undefined || value === '') return '---';
  return `${escapeSvgText(value)} ${escapeSvgText(suffix)}`;
}

export function readValue(row, path, fallback = undefined) {
  return path.reduce((current, key) => current?.[key], row) ?? fallback;
}

export function svgEl(name, attrs = {}, children = '') {
  const attrText = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeSvgText(value)}"`)
    .join(' ');
  const open = attrText ? `<${name} ${attrText}` : `<${name}`;
  return children ? `${open}>${children}</${name}>` : `${open}/>`;
}

export function svgCard(inner, label = 'Engineering SVG preview', viewBox = '0 0 420 250') {
  const safeLabel = escapeSvgText(label);
  return `<div class="svg-card"><svg viewBox="${viewBox}" role="img" aria-label="${safeLabel}">${inner}</svg></div>`;
}

export function basePanel(width = 420, height = 250) {
  return svgEl('rect', { width, height, rx: 16, fill: '#07111f' });
}

export function centerLine(y = 138) {
  return svgEl('line', { x1: 38, y1: y, x2: 382, y2: y, stroke: '#334155', 'stroke-dasharray': '7 7' });
}

export function dimensionLine(x1, y1, x2, y2, text, textX, textY) {
  return `${svgEl('line', { x1, y1, x2, y2, stroke: '#38bdf8', 'stroke-width': 2 })}
    ${svgEl('text', { x: textX, y: textY, fill: '#e0f2fe', 'text-anchor': 'middle', 'font-size': 15 }, escapeSvgText(text))}`;
}

export function isUnsafeSvg(svg) {
  return UNSAFE_SVG_RE.test(svg);
}
