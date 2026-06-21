const TEXT_SELECTOR = 'text, tspan';
const IDENTITY_MATRIX = [1, 0, 0, 1, 0, 0];

export function buildSvgTextInventory(svgRoot, options = {}) {
  const root = svgRoot?.nodeType ? svgRoot : null;
  if (!root?.querySelectorAll) return [];

  const measure = typeof options.measureTextNode === 'function' ? options.measureTextNode : null;
  const includeContainerText = options.includeContainerText === true;
  const nodes = [...root.querySelectorAll(TEXT_SELECTOR)].filter((node) => {
    const text = rawTextContent(node);
    if (!text) return false;
    if (includeContainerText) return true;
    return !hasTextLikeChild(node);
  });

  return nodes.map((node) => entryForNode(node, root, measure)).filter(Boolean);
}

export function normalizeSvgText(value) {
  return String(value ?? '')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function pointInsideBox(point, box, tolerance = 0) {
  if (!point || !isBox(box)) return false;
  return point.x >= box[0] - tolerance && point.x <= box[2] + tolerance && point.y >= box[1] - tolerance && point.y <= box[3] + tolerance;
}

export function boxCenter(box) {
  if (!isBoxObject(box)) return null;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function distance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
}

export function parseSvgTransform(value) {
  const text = String(value || '').trim();
  if (!text) return IDENTITY_MATRIX.slice();
  let matrix = IDENTITY_MATRIX.slice();
  const pattern = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let match;
  while ((match = pattern.exec(text))) {
    const op = match[1].toLowerCase();
    const values = parseNumberList(match[2]);
    const next = transformOperationMatrix(op, values);
    if (next) matrix = multiplyMatrices(matrix, next);
  }
  return matrix;
}

export function multiplyMatrices(left, right) {
  const [a1, b1, c1, d1, e1, f1] = left || IDENTITY_MATRIX;
  const [a2, b2, c2, d2, e2, f2] = right || IDENTITY_MATRIX;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function transformPoint(point, matrix = IDENTITY_MATRIX) {
  if (!point) return null;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const [a, b, c, d, e, f] = matrix;
  return { x: a * x + c * y + e, y: b * x + d * y + f };
}

export function transformBox(box, matrix = IDENTITY_MATRIX) {
  if (!isBoxObject(box)) return null;
  const corners = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x, y: box.y + box.height },
    { x: box.x + box.width, y: box.y + box.height },
  ].map((point) => transformPoint(point, matrix)).filter(Boolean);
  if (corners.length !== 4) return null;
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function entryForNode(node, root, measure) {
  const text = rawTextContent(node);
  if (!text) return null;
  const path = stablePath(node, root);
  const matrix = composedTransformMatrix(node, root);
  const measured = safeMeasure(node, { path, text }, measure);
  const localPoint = inheritedPoint(node);
  const localBox = measured || fallbackBox(node, text, localPoint);
  const bbox = transformBox(localBox, matrix) || localBox;
  const transformedPoint = transformPoint(localPoint, matrix);
  const center = boxCenter(bbox) || transformedPoint || localPoint || null;
  return {
    path,
    node,
    text,
    normalizedText: normalizeSvgText(text),
    rawText: String(node.textContent ?? ''),
    x: transformedPoint?.x ?? center?.x ?? null,
    y: transformedPoint?.y ?? center?.y ?? null,
    bbox,
    center,
    tagName: String(node.tagName || node.nodeName || '').toLowerCase(),
    parentPath: node.parentElement || node.parentNode ? stablePath(node.parentElement || node.parentNode, root) : '',
    transform: inheritedAttributeChain(node, 'transform').join(' '),
    className: stringAttr(node, 'class') || classNameValue(node),
    style: stringAttr(node, 'style'),
  };
}

function safeMeasure(node, seed, measure) {
  if (measure) {
    const box = normalizeBox(measure(node, seed));
    if (box) return box;
  }
  if (typeof node.getBBox === 'function') {
    try {
      const box = normalizeBox(node.getBBox());
      if (box) return box;
    } catch {
      // Detached SVG nodes and Node test doubles commonly cannot measure.
    }
  }
  return null;
}

function fallbackBox(node, text, point) {
  const p = point || { x: 0, y: 0 };
  const fontSize = inheritedNumberAttr(node, 'font-size') || inheritedStyleFontSize(node) || 80;
  const width = Math.max(fontSize * 0.6, String(text).length * fontSize * 0.58);
  const height = fontSize;
  return { x: p.x, y: p.y - height, width, height };
}

function inheritedPoint(node) {
  let current = node;
  while (current) {
    const x = firstNumberAttr(current, 'x');
    const y = firstNumberAttr(current, 'y');
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    current = current.parentElement || current.parentNode || null;
  }
  return null;
}

function inheritedNumberAttr(node, name) {
  let current = node;
  while (current) {
    const value = firstNumberAttr(current, name);
    if (Number.isFinite(value)) return value;
    current = current.parentElement || current.parentNode || null;
  }
  return NaN;
}

function firstNumberAttr(node, name) {
  const raw = stringAttr(node, name);
  const first = String(raw || '').split(/[\s,]+/).find(Boolean);
  const value = Number(first);
  return Number.isFinite(value) ? value : NaN;
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

function transformOperationMatrix(op, values) {
  if (op === 'matrix' && values.length >= 6) return values.slice(0, 6);
  if (op === 'translate') return [1, 0, 0, 1, values[0] || 0, values.length > 1 ? values[1] || 0 : 0];
  if (op === 'scale') {
    const sx = Number.isFinite(values[0]) ? values[0] : 1;
    const sy = Number.isFinite(values[1]) ? values[1] : sx;
    return [sx, 0, 0, sy, 0, 0];
  }
  if (op === 'rotate' && values.length >= 1) {
    const radians = values[0] * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const rotate = [cos, sin, -sin, cos, 0, 0];
    if (values.length >= 3) {
      const [angle, cx, cy] = values;
      void angle;
      return multiplyMatrices(multiplyMatrices([1, 0, 0, 1, cx, cy], rotate), [1, 0, 0, 1, -cx, -cy]);
    }
    return rotate;
  }
  if (op === 'skewx' && values.length >= 1) return [1, 0, Math.tan(values[0] * Math.PI / 180), 1, 0, 0];
  if (op === 'skewy' && values.length >= 1) return [1, Math.tan(values[0] * Math.PI / 180), 0, 1, 0, 0];
  return null;
}

function parseNumberList(value) {
  return String(value || '').trim().split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite);
}

function inheritedStyleFontSize(node) {
  let current = node;
  while (current) {
    const style = stringAttr(current, 'style');
    const match = /font-size\s*:\s*([0-9.]+)/i.exec(style);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) return value;
    }
    current = current.parentElement || current.parentNode || null;
  }
  return NaN;
}

function normalizeBox(box) {
  if (!box) return null;
  const x = Number(box.x);
  const y = Number(box.y);
  const width = Number(box.width);
  const height = Number(box.height);
  if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) return null;
  return { x, y, width, height };
}

function isBoxObject(box) {
  return box && [box.x, box.y, box.width, box.height].every((value) => Number.isFinite(Number(value)));
}

function isBox(box) {
  return Array.isArray(box) && box.length === 4 && box.every((value) => Number.isFinite(Number(value))) && Number(box[0]) < Number(box[2]) && Number(box[1]) < Number(box[3]);
}

function stablePath(node, root) {
  if (!node) return '';
  const parts = [];
  let current = node;
  while (current && current !== root?.parentNode) {
    const tag = String(current.tagName || current.nodeName || '').toLowerCase();
    if (!tag || tag === '#document') break;
    parts.push(`${tag}[${indexAmongSameTag(current)}]`);
    if (current === root) break;
    current = current.parentElement || current.parentNode || null;
  }
  return parts.reverse().join('/');
}

function indexAmongSameTag(node) {
  const tag = String(node.tagName || node.nodeName || '').toLowerCase();
  const parent = node.parentElement || node.parentNode;
  if (!parent?.children) return 1;
  let index = 0;
  for (const child of parent.children) {
    if (String(child.tagName || child.nodeName || '').toLowerCase() === tag) index += 1;
    if (child === node) return index;
  }
  return 1;
}

function hasTextLikeChild(node) {
  return [...(node.children || [])].some((child) => {
    const tag = String(child.tagName || child.nodeName || '').toLowerCase();
    return tag === 'text' || tag === 'tspan' || hasTextLikeChild(child);
  });
}

function rawTextContent(node) {
  const text = String(node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!text || /^(?:null|undefined)$/i.test(text)) return '';
  return text;
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
