import {
  boxCenter,
  multiplyMatrices,
  parseSvgTransform,
  pointInsideBox,
  transformBox,
} from './svgTextInventory.js';

const GEOMETRY_SELECTOR = 'path,line,polyline,polygon,rect,circle,ellipse';
const TEXT_SELECTOR = 'text,tspan';
const DEFAULT_ARTIFACT_WHEN = 'populated';

export function suppressSvgSlotArtifacts(svgRoot, slotBinding, slotPopulation, options = {}) {
  const result = emptyArtifactResult(slotBinding?.sourceCode || slotPopulation?.sourceCode || '');
  if (!svgRoot?.querySelectorAll || !slotBinding?.slots || !Array.isArray(slotPopulation?.slots)) return result;

  const threshold = confidenceThreshold(slotBinding, options);
  const bySlot = new Map(slotPopulation.slots.map((slot) => [slot.slot, slot]));
  const hiddenNodes = new Set();

  for (const [slotLabel, slot] of Object.entries(slotBinding.slots)) {
    const detail = bySlot.get(slotLabel);
    const state = isHighConfidencePopulated(detail, threshold) ? 'populated' : 'missing';
    const artifactBoxes = artifactBoxesForState(slot?.target?.artifactBoxes, state);
    if (!artifactBoxes.length) continue;

    const hiddenForSlot = [];
    for (const artifact of artifactBoxes) {
      hiddenForSlot.push(...hideArtifactsInBox(svgRoot, slotLabel, artifact, options, hiddenNodes));
    }

    if (!hiddenForSlot.length) continue;
    const paths = hiddenForSlot.map((entry) => entry.path).filter(Boolean);
    result.hiddenArtifactCount += hiddenForSlot.length;
    result.hiddenArtifactPaths.push(...paths);
    result.slots.push({ slot: slotLabel, state, hiddenArtifactCount: hiddenForSlot.length, hiddenArtifactPaths: paths });

    if (detail && typeof detail === 'object') {
      detail.hiddenArtifactCount = Number(detail.hiddenArtifactCount || 0) + hiddenForSlot.length;
      detail.hiddenArtifactPaths = [...(detail.hiddenArtifactPaths || []), ...paths];
      detail.hiddenGeometryCount = Number(detail.hiddenGeometryCount || 0) + hiddenForSlot.length;
      detail.hiddenGeometryPaths = [...(detail.hiddenGeometryPaths || []), ...paths];
    }
  }

  if (result.hiddenArtifactCount) {
    slotPopulation.hiddenArtifactCount = Number(slotPopulation.hiddenArtifactCount || 0) + result.hiddenArtifactCount;
    slotPopulation.hiddenArtifactPaths = [...(slotPopulation.hiddenArtifactPaths || []), ...result.hiddenArtifactPaths];
    slotPopulation.hiddenGeometryCount = Number(slotPopulation.hiddenGeometryCount || 0) + result.hiddenArtifactCount;
    slotPopulation.hiddenGeometryPaths = [...(slotPopulation.hiddenGeometryPaths || []), ...result.hiddenArtifactPaths];
  }

  return result;
}

function hideArtifactsInBox(svgRoot, slotLabel, artifact, options, hiddenNodes) {
  const box = normalizedBox(artifact?.box);
  if (!box) return [];
  const selector = artifact.includeText === true ? `${GEOMETRY_SELECTOR},${TEXT_SELECTOR}` : GEOMETRY_SELECTOR;
  const hidden = [];

  for (const node of safeQueryAll(svgRoot, selector)) {
    if (!node || hiddenNodes.has(node)) continue;
    if (!artifactNodeAllowed(node, artifact)) continue;
    const bbox = artifactNodeBBox(node, svgRoot, artifact, options);
    if (!bbox) continue;
    if (!artifactNodeMatchesBox(node, bbox, box)) continue;
    hideArtifactNode(node, slotLabel, artifact.reason || 'configured SVG slot artifact');
    hiddenNodes.add(node);
    hidden.push({ path: stableElementPath(node, svgRoot), node, bbox });
  }

  return hidden;
}

function artifactNodeAllowed(node, artifact = {}) {
  if (isProtectedNativeSlotNode(node)) return false;

  const tag = tagName(node);
  const tags = stringList(artifact.tags).map((item) => item.toLowerCase());
  if (tags.length && !tags.includes(tag)) return false;

  const strokeColors = stringList(artifact.strokeColors).map(normalizeColor).filter(Boolean);
  if (strokeColors.length) {
    const stroke = normalizeColor(strokeColor(node));
    if (!stroke || !strokeColors.includes(stroke)) return false;
  }

  return true;
}

function isProtectedNativeSlotNode(node) {
  if (!node?.getAttribute) return false;
  return node.getAttribute('data-pipetools-source-backed') === 'true'
    || node.getAttribute('data-pipetools-native-value') === 'true'
    || node.getAttribute('data-pipetools-pipe1-value-slot') === 'true'
    || node.getAttribute('data-pipetools-pipe1-static-label') === 'true'
    || Boolean(node.getAttribute('data-pipetools-slot-key'));
}

function artifactNodeBBox(node, root, artifact = {}, options = {}) {
  const local = safeMeasureElement(node, options.measureSvgElement) || staticNodeBox(node);
  if (!local) return null;
  const matrix = composedTransformMatrix(node, root);
  const box = transformBox(local, matrix) || local;
  const maxWidth = positiveNumber(artifact.maxWidth);
  const maxHeight = positiveNumber(artifact.maxHeight);
  if (maxWidth && box.width > maxWidth) return null;
  if (maxHeight && box.height > maxHeight) return null;
  return box;
}

function artifactNodeMatchesBox(node, bbox, box) {
  const center = boxCenter(bbox);
  if (pointInsideBox(center, box, 0)) return true;
  if (nodeEndpointInsideBox(node, box)) return true;
  return boxIntersectsObject(box, bbox);
}

function nodeEndpointInsideBox(node, box) {
  const tag = tagName(node);
  if (tag === 'line') {
    return pointInsideBox({ x: firstNumberAttr(node, 'x1'), y: firstNumberAttr(node, 'y1') }, box, 0)
      || pointInsideBox({ x: firstNumberAttr(node, 'x2'), y: firstNumberAttr(node, 'y2') }, box, 0);
  }
  if (tag === 'polyline' || tag === 'polygon') {
    return parsePointList(stringAttr(node, 'points')).some((point) => pointInsideBox(point, box, 0));
  }
  return false;
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
    const x = inheritedNumberAttr(node, 'x');
    const y = inheritedNumberAttr(node, 'y');
    const text = String(node.textContent || '').trim();
    const fontSize = inheritedNumberAttr(node, 'font-size') || 100;
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y: y - fontSize, width: Math.max(fontSize, text.length * fontSize * 0.55), height: fontSize };
  }
  return null;
}

function hideArtifactNode(node, slotLabel, reason) {
  if (!node?.setAttribute) return;
  node.setAttribute('data-pipetools-slot', slotLabel);
  node.setAttribute('data-pipetools-slot-artifact-hidden', 'true');
  node.setAttribute('data-pipetools-slot-artifact-reason', reason);
  node.setAttribute('display', 'none');
  node.setAttribute('aria-hidden', 'true');
}

function artifactBoxesForState(value, state) {
  const boxes = Array.isArray(value) ? value : [];
  return boxes.filter((artifact) => {
    const when = String(artifact?.when || DEFAULT_ARTIFACT_WHEN).trim().toLowerCase();
    return when === 'always' || when === state;
  });
}

function isHighConfidencePopulated(detail, threshold) {
  return detail?.status === 'populated' && Number(detail.confidence) >= threshold;
}

function confidenceThreshold(slotBinding, options) {
  const raw = Number(options.confidenceThreshold ?? slotBinding?.confidenceThreshold ?? 0.85);
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.85;
}

function emptyArtifactResult(sourceCode) {
  return { sourceCode, hiddenArtifactCount: 0, hiddenArtifactPaths: [], slots: [] };
}

function normalizedBox(box) {
  if (!Array.isArray(box) || box.length !== 4) return null;
  const values = box.map(Number);
  if (!values.every(Number.isFinite) || values[0] >= values[2] || values[1] >= values[3]) return null;
  return values;
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

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function stringList(value) {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function safeQueryAll(root, selector) {
  try {
    return [...(root.querySelectorAll?.(selector) || [])];
  } catch {
    return [];
  }
}

function composedTransformMatrix(node, root) {
  const chain = [];
  let current = node;
  while (current && current !== root?.parentNode) {
    chain.push(current);
    if (current === root) break;
    current = current.parentElement || current.parentNode || null;
  }
  return chain.reverse().reduce((matrix, item) => multiplyMatrices(matrix, parseSvgTransform(stringAttr(item, 'transform'))), [1, 0, 0, 1, 0, 0]);
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

function boxIntersectsObject(box, objectBox) {
  if (!box || !objectBox) return false;
  const other = [objectBox.x, objectBox.y, objectBox.x + objectBox.width, objectBox.y + objectBox.height];
  return !(other[2] < box[0] || other[0] > box[2] || other[3] < box[1] || other[1] > box[3]);
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
  const numbers = parseNumberList(value);
  const points = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] });
  }
  return points;
}

function parseNumberList(value) {
  return String(value || '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number).filter(Number.isFinite) || [];
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

function strokeColor(node) {
  const own = stringAttr(node, 'stroke');
  if (own) return own;
  let current = node.parentElement || node.parentNode;
  while (current) {
    const value = stringAttr(current, 'stroke');
    if (value) return value;
    current = current.parentElement || current.parentNode;
  }
  return '';
}

function normalizeColor(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text || text === 'none') return '';
  if (text === '#00f') return '#0000ff';
  if (text === '#0f0') return '#00ff00';
  if (text === 'blue') return '#0000ff';
  if (text === 'green' || text === 'lime') return '#00ff00';
  const rgb = text.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgb) return `#${rgb.slice(1).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
  return text;
}

function tagName(node) {
  return String(node?.tagName || node?.nodeName || '').toLowerCase();
}

function stringAttr(node, name) {
  return typeof node?.getAttribute === 'function' ? String(node.getAttribute(name) ?? '').trim() : '';
}
