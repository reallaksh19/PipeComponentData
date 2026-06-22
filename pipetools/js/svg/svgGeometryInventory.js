import {
  boxCenter,
  multiplyMatrices,
  parseSvgTransform,
  transformBox,
} from './svgTextInventory.js';

const GEOMETRY_SELECTOR = 'path,line,polyline,polygon,rect,circle,ellipse,text,tspan';
const IDENTITY_MATRIX = [1, 0, 0, 1, 0, 0];

export function buildSvgGeometryInventory(svgRoot, options = {}) {
  const root = svgRoot?.nodeType ? svgRoot : null;
  if (!root?.querySelectorAll) return [];

  const includeHidden = options.includeHidden !== false;
  const measure = typeof options.measureSvgElement === 'function' ? options.measureSvgElement : null;
  const nodes = safeQueryAll(root, GEOMETRY_SELECTOR);

  return nodes
    .map((node) => geometryEntry(node, root, measure))
    .filter(Boolean)
    .filter((entry) => includeHidden || isSvgGeometryVisible(entry.node));
}

export function computeVisibleSvgBBox(svgRoot, options = {}) {
  const entries = buildSvgGeometryInventory(svgRoot, { ...options, includeHidden: false });
  return unionBoxes(entries.map((entry) => entry.bbox).filter(Boolean));
}

export function isSvgGeometryVisible(node) {
  if (!node) return false;
  let current = node;
  while (current) {
    const display = stringAttr(current, 'display') || styleValue(current, 'display');
    if (String(display).trim().toLowerCase() === 'none') return false;
    const visibility = stringAttr(current, 'visibility') || styleValue(current, 'visibility');
    if (['hidden', 'collapse'].includes(String(visibility).trim().toLowerCase())) return false;
    current = current.parentElement || current.parentNode || null;
  }
  return true;
}

function geometryEntry(node, root, measure) {
  const local = safeMeasureElement(node, measure) || staticNodeBox(node);
  if (!local) return null;
  const matrix = composedTransformMatrix(node, root);
  const bbox = transformBox(local, matrix) || local;
  const center = boxCenter(bbox);
  return {
    path: stableElementPath(node, root),
    node,
    tagName: tagName(node),
    bbox,
    center,
    stroke: strokeColor(node),
    fill: fillColor(node),
    className: stringAttr(node, 'class') || classNameValue(node),
    style: stringAttr(node, 'style'),
    transform: inheritedAttributeChain(node, 'transform').join(' '),
    visibility: stringAttr(node, 'visibility') || styleValue(node, 'visibility'),
    display: stringAttr(node, 'display') || styleValue(node, 'display'),
  };
}

function safeMeasureElement(node, measure) {
  if (measure) {
    const box = normalizeBoxObject(measure(node));
    if (box) return box;
  }
  if (typeof node?.getBBox === 'function') {
    try {
      const box = normalizeBoxObject(node.getBBox());
      if (box) return box;
    } catch {
      // Detached/test SVG nodes commonly cannot measure geometry.
    }
  }
  return null;
}

function staticNodeBox(node) {
  const tag = tagName(node);
  if (tag === 'line') {
    const x1 = firstNumberAttr(node, 'x1');
    const y1 = firstNumberAttr(node, 'y1');
    const x2 = firstNumberAttr(node, 'x2');
    const y2 = firstNumberAttr(node, 'y2');
    if ([x1, y1, x2, y2].every(Number.isFinite)) return boxFromPoints([{ x: x1, y: y1 }, { x: x2, y: y2 }]);
  }
  if (tag === 'rect') {
    const x = firstNumberAttr(node, 'x') || 0;
    const y = firstNumberAttr(node, 'y') || 0;
    const width = firstNumberAttr(node, 'width');
    const height = firstNumberAttr(node, 'height');
    if ([x, y, width, height].every(Number.isFinite)) return { x, y, width, height };
  }
  if (tag === 'circle') {
    const cx = firstNumberAttr(node, 'cx');
    const cy = firstNumberAttr(node, 'cy');
    const r = firstNumberAttr(node, 'r');
    if ([cx, cy, r].every(Number.isFinite)) return { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r };
  }
  if (tag === 'ellipse') {
    const cx = firstNumberAttr(node, 'cx');
    const cy = firstNumberAttr(node, 'cy');
    const rx = firstNumberAttr(node, 'rx');
    const ry = firstNumberAttr(node, 'ry');
    if ([cx, cy, rx, ry].every(Number.isFinite)) return { x: cx - rx, y: cy - ry, width: 2 * rx, height: 2 * ry };
  }
  if (tag === 'polyline' || tag === 'polygon') {
    const points = parsePointList(stringAttr(node, 'points'));
    if (points.length) return boxFromPoints(points);
  }
  if (tag === 'path') {
    const points = parsePointList(stringAttr(node, 'd'));
    if (points.length) return boxFromPoints(points);
  }
  if (tag === 'text' || tag === 'tspan') {
    const x = firstNumberAttr(node, 'x');
    const y = firstNumberAttr(node, 'y');
    const text = String(node.textContent || '').trim();
    const fontSize = firstNumberAttr(node, 'font-size') || styleNumber(node, 'font-size') || 100;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y: y - fontSize, width: Math.max(fontSize, text.length * fontSize * 0.55), height: fontSize };
    }
  }
  return null;
}

function unionBoxes(boxes) {
  const valid = boxes.filter((box) => box && [box.x, box.y, box.width, box.height].every((value) => Number.isFinite(Number(value))));
  if (!valid.length) return null;
  const minX = Math.min(...valid.map((box) => box.x));
  const minY = Math.min(...valid.map((box) => box.y));
  const maxX = Math.max(...valid.map((box) => box.x + box.width));
  const maxY = Math.max(...valid.map((box) => box.y + box.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function normalizeBoxObject(box) {
  if (!box) return null;
  const x = Number(box.x);
  const y = Number(box.y);
  const width = Number(box.width);
  const height = Number(box.height);
  if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) return null;
  return { x, y, width, height };
}

function boxFromPoints(points) {
  const valid = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!valid.length) return null;
  const xs = valid.map((point) => point.x);
  const ys = valid.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function parsePointList(value) {
  const numbers = String(value || '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number).filter(Number.isFinite) || [];
  const points = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] });
  }
  return points;
}

function composedTransformMatrix(node, root) {
  const chain = [];
  let current = node;
  while (current && current !== root?.parentNode) {
    chain.push(current);
    if (current === root) break;
    current = current.parentElement || current.parentNode || null;
  }
  return chain.reverse().reduce((matrix, item) => multiplyMatrices(matrix, parseSvgTransform(stringAttr(item, 'transform'))), IDENTITY_MATRIX.slice());
}

function inheritedAttributeChain(node, name) {
  const values = [];
  let current = node;
  while (current) {
    const value = stringAttr(current, name);
    if (value) values.push(value);
    current = current.parentElement || current.parentNode || null;
  }
  return values.reverse();
}

function stableElementPath(node, root) {
  if (!node) return '';
  const parts = [];
  let current = node;
  while (current && current !== root?.parentNode) {
    const tag = tagName(current);
    if (!tag || tag === '#document') break;
    parts.push(`${tag}[${indexAmongSameTag(current)}]`);
    if (current === root) break;
    current = current.parentElement || current.parentNode || null;
  }
  return parts.reverse().join('/');
}

function indexAmongSameTag(node) {
  const tag = tagName(node);
  const parent = node.parentElement || node.parentNode;
  if (!parent?.children) return 1;
  let index = 0;
  for (const child of parent.children) {
    if (tagName(child) === tag) index += 1;
    if (child === node) return index;
  }
  return 1;
}

function firstNumberAttr(node, name) {
  const raw = stringAttr(node, name);
  const first = String(raw || '').split(/[\s,]+/).find(Boolean);
  const value = Number(first);
  return Number.isFinite(value) ? value : NaN;
}

function styleNumber(node, name) {
  const value = Number(styleValue(node, name));
  return Number.isFinite(value) ? value : NaN;
}

function strokeColor(node) {
  return stringAttr(node, 'stroke') || styleValue(node, 'stroke');
}

function fillColor(node) {
  return stringAttr(node, 'fill') || styleValue(node, 'fill');
}

function styleValue(node, name) {
  const style = stringAttr(node, 'style');
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|;)\\s*${escaped}\\s*:\\s*([^;]+)`, 'i').exec(style);
  return match?.[1]?.trim() || '';
}

function safeQueryAll(root, selector) {
  try {
    return [...(root.querySelectorAll?.(selector) || [])];
  } catch {
    return [];
  }
}

function tagName(node) {
  return String(node?.tagName || node?.nodeName || '').toLowerCase();
}

function stringAttr(node, name) {
  return typeof node?.getAttribute === 'function' ? String(node.getAttribute(name) ?? '').trim() : '';
}

function classNameValue(node) {
  const value = node?.className;
  if (typeof value === 'string') return value;
  if (typeof value?.baseVal === 'string') return value.baseVal;
  return '';
}
