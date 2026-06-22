import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pipe1SlotPath = path.join(repoRoot, 'pipetools/symbols/dxf/slots/Pipe1.json');
const pipeRow = {
  dimensions: {
    odMm: { value: 10.3 },
    idMm: { value: 8.5873 },
    wallThicknessMm: { value: 1.24 },
  },
  weights: {
    weightKgPerM: { value: 0.37 },
  },
};

class TestNode {
  constructor(tagName, attrs = {}, text = '') {
    this.tagName = tagName;
    this.nodeName = tagName;
    this.textContent = text;
    this.attrs = new Map(Object.entries(attrs).map(([key, value]) => [key, String(value)]));
    this.children = [];
    this.parentElement = null;
    this.parentNode = null;
    this.ownerSVGElement = String(tagName).toLowerCase() === 'svg' ? this : null;
    this.nodeType = 1;
    this.dataset = datasetFromAttrs(this.attrs);
    this.className = this.attrs.get('class') || '';
    this.style = styleDeclaration(this.attrs.get('style') || '', (value) => {
      if (value) this.attrs.set('style', value);
      else this.attrs.delete('style');
    });
  }
  append(child) {
    child.parentElement = this;
    child.parentNode = this;
    child.ownerSVGElement = String(this.tagName).toLowerCase() === 'svg' ? this : this.ownerSVGElement;
    this.children.push(child);
    for (const descendant of child.querySelectorAll?.('*') || []) {
      descendant.ownerSVGElement = child.ownerSVGElement;
    }
  }
  setAttribute(name, value) {
    this.attrs.set(name, String(value));
    syncDomFacade(this, name, String(value));
  }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  removeAttribute(name) {
    this.attrs.delete(name);
    syncDomFacade(this, name, null);
  }
  matches(selector = '') { return matchesSelector(this, selector); }
  querySelectorAll(selector = '') {
    const matches = [];
    const walk = (node) => {
      for (const child of node.children || []) {
        if (matchesSelector(child, selector)) matches.push(child);
        walk(child);
      }
    };
    walk(this);
    return matches;
  }
  remove() {
    const siblings = this.parentNode?.children;
    if (Array.isArray(siblings)) {
      const index = siblings.indexOf(this);
      if (index >= 0) siblings.splice(index, 1);
    }
    this.parentElement = null;
    this.parentNode = null;
    this.ownerSVGElement = null;
  }
}

function matchesSelector(node, selector) {
  const tag = String(node.tagName || node.nodeName || '').toLowerCase();
  const selectors = String(selector || '').split(',').map((item) => item.trim()).filter(Boolean);
  return selectors.some((raw) => matchesSingleSelector(node, tag, raw));
}

function matchesSingleSelector(node, tag, rawSelector) {
  const selector = rawSelector.trim().toLowerCase();
  if (!selector) return false;
  if (selector === '*') return true;
  const last = selector.split(/\s+/).pop();
  const attrMatch = last.match(/^([a-z0-9_-]+)?\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]$/i);
  if (attrMatch) {
    const [, wantedTag, attrName, attrValue] = attrMatch;
    if (wantedTag && wantedTag !== tag) return false;
    const actual = node.getAttribute?.(attrName);
    return attrValue == null ? actual != null : String(actual) === attrValue;
  }
  const classMatch = last.match(/^([a-z0-9_-]+)?\.([a-z0-9_-]+)$/i);
  if (classMatch) {
    const [, wantedTag, className] = classMatch;
    if (wantedTag && wantedTag !== tag) return false;
    return String(node.getAttribute?.('class') || node.className || '').split(/\s+/).includes(className);
  }
  return last === tag;
}

function syncDomFacade(node, name, value) {
  if (name === 'class') node.className = value || '';
  if (name === 'style') node.style = styleDeclaration(value || '', (styleText) => {
    if (styleText) node.attrs.set('style', styleText);
    else node.attrs.delete('style');
  });
  if (name.startsWith('data-')) {
    const key = datasetKey(name);
    if (value == null) delete node.dataset[key];
    else node.dataset[key] = value;
  }
}

function datasetFromAttrs(attrs) {
  const dataset = {};
  for (const [name, value] of attrs.entries()) {
    if (name.startsWith('data-')) dataset[datasetKey(name)] = value;
  }
  return dataset;
}

function datasetKey(name) {
  return String(name).slice(5).replace(/-([a-z0-9])/gi, (_, ch) => ch.toUpperCase());
}

function styleDeclaration(styleText, onChange) {
  const values = new Map(String(styleText || '').split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf(':');
    return index >= 0 ? [part.slice(0, index).trim(), part.slice(index + 1).trim()] : [part, ''];
  }));
  const commit = () => onChange([...values.entries()].map(([key, value]) => `${key}: ${value}`).join('; '));
  return {
    setProperty(name, value) { values.set(String(name), String(value)); commit(); },
    removeProperty(name) { const previous = values.get(String(name)) || ''; values.delete(String(name)); commit(); return previous; },
    getPropertyValue(name) { return values.get(String(name)) || ''; },
    toString() { return [...values.entries()].map(([key, value]) => `${key}: ${value}`).join('; '); },
  };
}

function textNode(text, x, y, fontSize = 80) {
  return new TestNode('text', { x: String(x), y: String(y), 'font-size': String(fontSize) }, text);
}

function inventoryEntry(text, x, y, path, node = textNode(text, x, y)) {
  return {
    path,
    node,
    text,
    normalizedText: String(text).trim().toLowerCase(),
    rawText: text,
    x,
    y,
    bbox: { x, y, width: 120, height: 80 },
    center: { x, y },
    tagName: 'text',
    parentPath: 'svg[1]',
    transform: '',
    className: '',
    style: '',
  };
}

function pipe1Inventory(binding, labels = ['OD', 'ID', 'Wall / Thk', 'Outside Radius', 'Weight / m']) {
  return labels.map((label, index) => {
    const slot = binding.slots[label];
    const [x1, y1, x2, y2] = slot.target.targetBox;
    const text = slot.target.allowedExistingText?.[0] || slot.labelText?.[0] || label;
    return inventoryEntry(text, (x1 + x2) / 2, (y1 + y2) / 2, `svg[1]/text[${index + 1}]`);
  });
}

test('Pipe1 native value typography has bounded source-scale and CSS override for DXF inline style', async () => {
  const binding = JSON.parse(await readFile(pipe1SlotPath, 'utf8'));
  const style = binding.nativeTextStyle;
  assert.ok(Number(style.fontSize) >= 90, 'Pipe1 native font is too small');
  assert.ok(Number(style.fontSize) <= 160, 'Pipe1 native font is oversized');
  assert.ok(Number(style.strokeWidth) <= 4, 'Pipe1 native stroke halo is oversized');
  const css = await readFile(path.join(repoRoot, 'pipetools/pipetools.css'), 'utf8');
  assert.match(css, /\[data-pipetools-native-value="true"\]/);
  assert.match(css, /\[data-pipetools-native-value="true"\]\s*\*/);
  assert.match(css, /font-size:\s*124px\s*!important/);
  assert.match(css, /rect\.BoundingBox\s*\{\s*display:\s*none\s*!important/);
  assert.doesNotMatch(css, /font-size:\s*2[0-9]{2}px\s*!important/);
});

test('Pipe1 cleanup-only Outside Radius is hidden without becoming evidence slot miss', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const { suppressSvgSlotArtifacts } = await import('../pipetools/js/svg/svgSlotArtifactCleanup.js');
  const { buildDimensionCalloutDiagnosticModel } = await import('../pipetools/js/svg/dimensionCalloutDiagnostics.js');
  const binding = JSON.parse(await readFile(pipe1SlotPath, 'utf8'));
  assert.equal(binding.slots['Outside Radius'].target.hideGeometryWhenMissing, false, 'cleanup-only radius must not use broad geometryBox hiding');
  const outsideText = textNode('Outside Radius', 8900, 15000, 73);
  const inventory = [
    ...pipe1Inventory(binding, ['OD', 'ID', 'Wall / Thk', 'Weight / m']),
    inventoryEntry('Outside Radius', 8900, 15000, 'svg[1]/text[outside-radius]', outsideText),
  ];
  const outsideRadiusLine = new TestNode('line', { x1: '8355', y1: '14874', x2: '9457', y2: '14874', stroke: 'rgb(0,255,0)' });
  const outsideRadiusArrow = new TestNode('line', { x1: '8355', y1: '14491', x2: '8379', y2: '14578', stroke: 'rgb(0,255,0)' });
  const outsideRadiusBlueMarker = new TestNode('line', { x1: '8985', y1: '14800', x2: '9003', y2: '14800', stroke: 'rgb(0,0,255)' });
  const pipeRightEdge = new TestNode('line', { x1: '8012', y1: '14312', x2: '8012', y2: '13359', stroke: 'rgb(0,255,0)' });
  const blackPipeArcInsideRadiusBox = new TestNode('line', { x1: '8350', y1: '14420', x2: '8400', y2: '14480', stroke: 'rgb(15,15,15)' });
  const cyanCenterlineInsideRadiusBox = new TestNode('line', { x1: '8300', y1: '14491', x2: '8500', y2: '14491', stroke: 'rgb(0,255,255)' });
  const unrelatedGreenLine = new TestNode('line', { x1: '5499', y1: '13632', x2: '6437', y2: '13632', stroke: 'rgb(0,255,0)' });
  const cyanCenterline = new TestNode('line', { x1: '7200', y1: '13000', x2: '7200', y2: '16000', stroke: 'rgb(0,255,255)' });
  const root = new TestNode('svg');
  for (const node of [outsideRadiusLine, outsideRadiusArrow, outsideRadiusBlueMarker, pipeRightEdge, blackPipeArcInsideRadiusBox, cyanCenterlineInsideRadiusBox, unrelatedGreenLine, cyanCenterline]) root.append(node);

  const result = populateSvgSlots(root, 'Pipe1', binding, pipeRow, { inventory });
  suppressSvgSlotArtifacts(root, binding, result);
  const evidence = buildDimensionCalloutDiagnosticModel(pipeRow, { sourceCode: 'Pipe1', family: 'PIPE' }, [], { slotPopulation: result });

  assert.equal(outsideText.textContent, '');
  assert.equal(outsideRadiusLine.getAttribute('display'), 'none');
  assert.equal(outsideRadiusArrow.getAttribute('display'), 'none');
  assert.equal(outsideRadiusBlueMarker.getAttribute('display'), 'none');
  assert.equal(pipeRightEdge.getAttribute('display'), null);
  assert.equal(blackPipeArcInsideRadiusBox.getAttribute('display'), null);
  assert.equal(cyanCenterlineInsideRadiusBox.getAttribute('display'), null);
  assert.equal(unrelatedGreenLine.getAttribute('display'), null);
  assert.equal(cyanCenterline.getAttribute('display'), null);
  assert.equal(evidence.nativeCount, 4);
  assert.equal(evidence.hiddenNativeCleanupCount, 1);
  assert.equal(evidence.failedNativeCount, 0);
  assert.deepEqual(evidence.missing, []);
});

test('Pipe1 stale weight table rows are hidden and Weight / m remains source-backed', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const { suppressSvgSlotArtifacts } = await import('../pipetools/js/svg/svgSlotArtifactCleanup.js');
  const binding = JSON.parse(await readFile(pipe1SlotPath, 'utf8'));
  const weightValue = textNode('Kg/Mtr', 8300, 16000, 80);
  const inventory = [
    ...pipe1Inventory(binding, ['OD', 'ID', 'Wall / Thk', 'Outside Radius']),
    inventoryEntry('Kg/Mtr', 8300, 16000, 'svg[1]/text[weight-value]', weightValue),
  ];
  const weightLabel = textNode('Weight', 5200, 15980, 80);
  const waterLabel = textNode('Weight Including Water', 5200, 16200, 80);
  const inertiaLabel = textNode('Second Moment of Area', 5200, 16400, 80);
  const waterUnit = textNode('Kg/Mtr', 8200, 16200, 80);
  const inertiaUnit = textNode('cm4', 8200, 16400, 80);
  const root = new TestNode('svg');
  for (const node of [weightLabel, waterLabel, inertiaLabel, waterUnit, inertiaUnit]) root.append(node);

  const result = populateSvgSlots(root, 'Pipe1', binding, pipeRow, { inventory });
  suppressSvgSlotArtifacts(root, binding, result);

  assert.equal(weightValue.textContent, '0.37 kg/m');
  assert.equal(weightValue.getAttribute('data-pipetools-source-backed'), 'true');
  assert.equal(weightLabel.getAttribute('display'), null);
  assert.equal(waterLabel.getAttribute('display'), 'none');
  assert.equal(inertiaLabel.getAttribute('display'), 'none');
  assert.equal(waterUnit.getAttribute('display'), 'none');
  assert.equal(inertiaUnit.getAttribute('display'), 'none');
  assert.doesNotMatch(weightValue.textContent, /water|moment|cm4/i);
});

test('geometry inventory exposes hidden nodes but visible bbox excludes cleanup geometry', async () => {
  const { buildSvgGeometryInventory, computeVisibleSvgBBox } = await import('../pipetools/js/svg/svgGeometryInventory.js');
  const pipeRing = new TestNode('circle', { cx: '100', cy: '100', r: '40', stroke: '#111111', fill: 'none' });
  const hiddenRadius = new TestNode('line', { x1: '900', y1: '900', x2: '1200', y2: '900', stroke: '#00ff00', display: 'none' });
  const hiddenRow = textNode('Second Moment of Area', 950, 960, 80);
  hiddenRow.setAttribute('display', 'none');
  const root = new TestNode('svg');
  for (const node of [pipeRing, hiddenRadius, hiddenRow]) root.append(node);

  const all = buildSvgGeometryInventory(root);
  assert.equal(all.length, 3);
  assert.ok(all.some((entry) => entry.display === 'none'));
  assert.deepEqual(computeVisibleSvgBBox(root), { x: 60, y: 60, width: 80, height: 80 });
});

test('geometry inventory ignores non-rendered SVG defs when computing visible bbox', async () => {
  const { buildSvgGeometryInventory, computeVisibleSvgBBox } = await import('../pipetools/js/svg/svgGeometryInventory.js');
  const defs = new TestNode('defs');
  defs.append(new TestNode('path', { d: 'M 0 0 L 2000 0 L 2000 2000 L 0 2000 Z' }));
  const clipPath = new TestNode('clipPath');
  clipPath.append(new TestNode('rect', { x: '0', y: '0', width: '21000', height: '29700' }));
  const pipeRing = new TestNode('circle', { cx: '7200', cy: '14600', r: '1000', stroke: '#111111', fill: 'none' });
  const root = new TestNode('svg');
  for (const node of [defs, clipPath, pipeRing]) root.append(node);

  const all = buildSvgGeometryInventory(root);
  assert.equal(all.length, 1);
  assert.equal(all[0].tagName, 'circle');
  assert.deepEqual(computeVisibleSvgBBox(root), { x: 6200, y: 13600, width: 2000, height: 2000 });
});

test('manual anchor overlay architecture is not reintroduced', async () => {
  assert.equal(existsSync(path.join(repoRoot, 'pipetools/js/svg/symbolAnchorStore.js')), false);
  assert.equal(existsSync(path.join(repoRoot, 'pipetools/symbols/dxf/anchors')), false);
  for (const relativePath of [
    'pipetools/js/svg/dimensionCallouts.js',
    'pipetools/js/svg/dxfSymbolEngine.js',
    'pipetools/js/svg/svgSlotBindingStore.js',
    'pipetools/js/svg/svgSlotPopulator.js',
  ]) {
    const text = await readFile(path.join(repoRoot, relativePath), 'utf8');
    assert.doesNotMatch(text, /symbolAnchorStore|manual-anchor|PipeToolsSymbolAnchor/);
  }
});
