const TEXT_SELECTOR = 'text, tspan';

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

function entryForNode(node, root, measure) {
  const text = rawTextContent(node);
  if (!text) return null;
  const path = stablePath(node, root);
  const measured = safeMeasure(node, { path, text }, measure);
  const attrPoint = inheritedPoint(node);
  const bbox = measured || fallbackBox(node, text, attrPoint);
  const center = boxCenter(bbox) || attrPoint || null;
  return {
    path,
    node,
    text,
    normalizedText: normalizeSvgText(text),
    rawText: String(node.textContent ?? ''),
    x: attrPoint?.x ?? center?.x ?? null,
    y: attrPoint?.y ?? center?.y ?? null,
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
  const fontSize = inheritedNumberAttr(node, 'font-size') || 80;
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
