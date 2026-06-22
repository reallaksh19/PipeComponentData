import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const dxfRoot = path.join(repoRoot, 'pipetools/symbols/dxf');
const slotsRoot = path.join(dxfRoot, 'slots');
const manifest = JSON.parse(await readFile(path.join(dxfRoot, 'dxf-symbol-manifest.json'), 'utf8'));
const manifestCodes = new Set((manifest.symbols || []).map((symbol) => symbol.sourceCode));
const readSlot = async (sourceCode) => JSON.parse(await readFile(path.join(slotsRoot, `${sourceCode}.json`), 'utf8'));

class TextNode {
  constructor(text, attrs = {}) {
    this.textContent = text;
    this.tagName = 'text';
    this.nodeName = 'text';
    this.attrs = new Map(Object.entries(attrs).map(([key, value]) => [key, String(value)]));
    this.children = [];
    this.nodeType = 1;
    this.parentElement = null;
    this.parentNode = null;
    this.ownerSVGElement = null;
    this.dataset = datasetFromAttrs(this.attrs);
    this.className = this.attrs.get('class') || '';
    this.style = styleDeclaration(this.attrs.get('style') || '', (value) => {
      if (value) this.attrs.set('style', value);
      else this.attrs.delete('style');
    });
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
  querySelectorAll() { return []; }
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

class ElementNode extends TextNode {
  constructor(tagName, attrs = {}, children = []) {
    super('', attrs);
    this.tagName = tagName;
    this.nodeName = tagName;
    this.children = [];
    if (String(tagName).toLowerCase() === 'svg') this.ownerSVGElement = this;
    children.forEach((child) => this.append(child));
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
  querySelectorAll(selector = '') {
    const out = [];
    const walk = (node) => {
      for (const child of node.children || []) {
        if (matchesSelector(child, selector)) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
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
    removeProperty(name) { const previous = values.get(String(name)) || ''; values.delete(name); commit(); return previous; },
    getPropertyValue(name) { return values.get(String(name)) || ''; },
    toString() { return [...values.entries()].map(([key, value]) => `${key}: ${value}`).join('; '); },
  };
}

function inventoryEntry(text, x, y, path) {
  const node = new TextNode(text);
  return { path, node, text, normalizedText: String(text).toLowerCase(), rawText: text, x, y, bbox: { x, y, width: 10, height: 10 }, center: { x, y }, tagName: 'text', parentPath: 'svg[1]', transform: '', className: '', style: '' };
}

function boxCenter(box) {
  if (!Array.isArray(box) || box.length !== 4) return null;
  return { x: (box[0] + box[2]) / 2, y: (box[1] + box[3]) / 2 };
}

function inventoryFor(binding) {
  const entries = [];
  let index = 1;
  for (const [label, slot] of Object.entries(binding.slots)) {
    const target = boxCenter(slot.target.targetBox);
    if (target) {
      const placeholder = slot.target.placeholderText?.[0] || slot.target.allowedExistingText?.[0] || slot.labelText?.[0] || label;
      entries.push(inventoryEntry(placeholder, target.x, target.y, `svg[1]/text[target-${index}]`));
    }
    const labelPoint = boxCenter(slot.target.labelBox);
    const labelText = slot.labelText?.[0] || slot.displayLabel || label;
    if (labelPoint && labelText) {
      entries.push(inventoryEntry(labelText, labelPoint.x, labelPoint.y, `svg[1]/text[label-${index}]`));
    }
    index += 1;
  }
  return entries;
}

const pipeRow = { dimensions: { odMm: { value: 290 }, idMm: { value: 212 }, wallThicknessMm: { value: 39 } }, weights: { weightKgPerM: { value: 84 } } };
const flangeRow = { dimensions: { flangeOdMm: { value: 150 }, boreMm: { value: 80 }, flangeThicknessMm: { value: 18 }, rfDiaMm: { value: 92 }, pcdMm: { value: 120 }, boltCount: { value: 4 } }, weights: { kg: { value: 3.7 } } };

test('v2 slot files exist for the active sourceCodes', async () => {
  for (const sourceCode of ['Pipe1', 'Flan1', 'Flan3']) {
    const binding = await readSlot(sourceCode);
    assert.equal(binding.version, 'PipeToolsSvgSlotBinding.v2');
    assert.equal(binding.coordinateSpace, 'source-svg-viewBox');
    assert.ok(manifestCodes.has(sourceCode));
    assert.ok(Object.values(binding.slots).every((slot) => Array.isArray(slot.target.targetBox)));
  }
});

test('runtime slot normalizer preserves Pipe1 cleanup directives and typography controls', async () => {
  const { normalizeSvgSlotBinding } = await import('../pipetools/js/svg/svgSlotBindingStore.js');
  const binding = normalizeSvgSlotBinding(await readSlot('Pipe1'));
  assert.ok(binding, 'Pipe1 binding should normalize for browser runtime');
  assert.equal(binding.nativeTextStyle.fontSize, '110');
  assert.equal(binding.nativeTextStyle.fontWeight, '600');

  const outsideRadius = binding.slots['Outside Radius'];
  assert.equal(outsideRadius.purpose, 'cleanup-unbacked-native-dimension');
  assert.equal(outsideRadius.target.hideGeometryWhenMissing, false);
  assert.deepEqual(outsideRadius.target.geometryBox, [8250, 14280, 11080, 15450]);
  assert.ok(outsideRadius.target.cleanupPlaceholderText.includes('Outside Radius'));
  assert.equal(outsideRadius.target.artifactBoxes.length, 2);
  assert.equal(outsideRadius.target.artifactBoxes[0].includeText, true);
  assert.deepEqual(outsideRadius.target.artifactBoxes[1].tags, ['line', 'path', 'polyline']);

  const weight = binding.slots['Weight / m'];
  assert.equal(weight.target.artifactBoxes.length, 2);
  assert.ok(weight.target.artifactBoxes.every((box) => box.includeText === true));
});

test('text inventory accepts measured text nodes', async () => {
  const { buildSvgTextInventory } = await import('../pipetools/js/svg/svgTextInventory.js');
  const node = new TextNode('Outside Diameter');
  const root = new ElementNode('svg', {}, [node]);
  const inventory = buildSvgTextInventory(root, { measureTextNode: () => ({ x: 10, y: 20, width: 100, height: 40 }) });
  assert.equal(inventory[0].normalizedText, 'outside diameter');
  assert.deepEqual(inventory[0].center, { x: 60, y: 40 });
});

test('text inventory maps inherited SVG transforms into source coordinates', async () => {
  const { buildSvgTextInventory } = await import('../pipetools/js/svg/svgTextInventory.js');
  const text = new TextNode('Outside Diameter', { x: '10', y: '20', 'font-size': '10' });
  const group = new ElementNode('g', { transform: 'translate(100,200) scale(2)' }, [text]);
  const root = new ElementNode('svg', {}, [group]);
  const [entry] = buildSvgTextInventory(root);
  assert.equal(entry.text, 'Outside Diameter');
  assert.equal(entry.x, 120);
  assert.equal(entry.y, 240);
  assert.ok(entry.center.x > 120);
  assert.ok(entry.center.y > 220);
});

test('Pipe1 slots populate separate value placeholders without overwriting static labels', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = await readSlot('Pipe1');
  const staleTopDash = inventoryEntry('-', 7000, 13100, 'svg[1]/text[stale-od-dash]');
  const inventory = [...inventoryFor(binding), staleTopDash];
  const labelNodesBefore = inventory.filter((entry) => String(entry.path).includes('label-')).map((entry) => entry.node);
  const result = populateSvgSlots(new ElementNode('svg'), 'Pipe1', binding, pipeRow, { inventory });
  assert.deepEqual(result.populatedLabels, ['OD', 'ID', 'Wall / Thk', 'Weight / m']);
  assert.ok(result.missingLabels.includes('Outside Radius'));
  const od = inventory.find((entry) => entry.node.textContent === '290 mm' && entry.node.getAttribute('data-pipetools-slot') === 'OD')?.node;
  const weight = inventory.find((entry) => entry.node.textContent === '84 kg/m' && entry.node.getAttribute('data-pipetools-slot') === 'Weight / m')?.node;
  assert.ok(od);
  assert.ok(weight);
  assert.equal(od.getAttribute('data-pipetools-native-value'), 'true');
  assert.equal(od.getAttribute('data-pipetools-source-backed'), 'true');
  assert.equal(od.getAttribute('font-weight'), '600');
  assert.ok(Number(od.getAttribute('font-size')) >= 80);
  assert.ok(Number(od.getAttribute('font-size')) <= 110);
  assert.ok(Number(od.getAttribute('stroke-width')) <= 3);
  assert.equal(weight.getAttribute('paint-order'), 'stroke fill');
  assert.ok(labelNodesBefore.some((node) => node.textContent === 'Outside Diameter'));
  assert.ok(labelNodesBefore.some((node) => node.textContent === 'Inside Diameter'));
  assert.equal(staleTopDash.node.textContent, '');
  assert.equal(staleTopDash.node.getAttribute('data-pipetools-placeholder-cleaned'), 'true');
  assert.ok(result.cleanedPlaceholderCount >= 1);
  assert.ok(result.slots.filter((slot) => slot.status === 'populated').every((slot) => slot.confidence >= 0.85));
});

test('slot artifact cleanup hides configured small artifacts and unbacked native dimensions after runtime normalization', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const { suppressSvgSlotArtifacts } = await import('../pipetools/js/svg/svgSlotArtifactCleanup.js');
  const { normalizeSvgSlotBinding } = await import('../pipetools/js/svg/svgSlotBindingStore.js');
  const binding = normalizeSvgSlotBinding(await readSlot('Pipe1'));
  const inventory = inventoryFor(binding);
  const blueOdMarker = new ElementNode('line', { x1: '7000', y1: '13000', x2: '7100', y2: '13000', stroke: '#0000ff' });
  const greenOdDimension = new ElementNode('line', { x1: '6400', y1: '13000', x2: '8600', y2: '13000', stroke: '#00ff00' });
  const outsideBlueMarker = new ElementNode('line', { x1: '100', y1: '100', x2: '200', y2: '100', stroke: '#0000ff' });
  const outsideRadiusLine = new ElementNode('line', { x1: '8355', y1: '14874', x2: '9457', y2: '14874', stroke: '#00ff00' });
  const outsideRadiusLeader = new ElementNode('line', { x1: '8355', y1: '15121', x2: '8355', y2: '14578', stroke: '#00ff00' });
  const outsideRadiusLabel = new TextNode('Outside Radius', { x: '8641', y: '15021', 'font-size': '73' });
  const pipeRing = new ElementNode('circle', { cx: '7200', cy: '14600', r: '1000', stroke: '#000000' });
  const root = new ElementNode('svg', {}, [blueOdMarker, greenOdDimension, outsideBlueMarker, outsideRadiusLine, outsideRadiusLeader, outsideRadiusLabel, pipeRing]);
  const result = populateSvgSlots(root, 'Pipe1', binding, pipeRow, { inventory });
  const artifacts = suppressSvgSlotArtifacts(root, binding, result);
  assert.equal(blueOdMarker.getAttribute('display'), 'none');
  assert.equal(blueOdMarker.getAttribute('data-pipetools-slot-artifact-hidden'), 'true');
  assert.equal(greenOdDimension.getAttribute('display'), null);
  assert.equal(outsideBlueMarker.getAttribute('display'), null);
  assert.equal(outsideRadiusLine.getAttribute('display'), 'none');
  assert.equal(outsideRadiusLeader.getAttribute('display'), 'none');
  assert.equal(outsideRadiusLabel.getAttribute('display'), 'none');
  assert.equal(pipeRing.getAttribute('display'), null);
  assert.ok(artifacts.hiddenArtifactCount >= 4);
  assert.ok(result.hiddenArtifactCount >= 4);
});

test('a candidate outside targetBox is not selected', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = { sourceCode: 'Pipe1', confidenceThreshold: 0.85, slots: { OD: { semanticLabel: 'OD', displayLabel: 'OD', labelText: ['Outside Diameter'], preferredValueKeys: ['OD', 'dimensions.odMm'], format: 'diameter-mm', target: { targetBox: [900, 900, 1200, 1100], labelBox: [0, 0, 250, 150], placeholderText: ['-'], maxDistanceFromLabel: 2000 }, suppressOverlayLabels: ['OD'] } } };
  const outside = inventoryEntry('-', 150, 100, 'outside');
  const inside = inventoryEntry('-', 1000, 1000, 'inside');
  const result = populateSvgSlots(new ElementNode('svg'), 'Pipe1', binding, pipeRow, { inventory: [inventoryEntry('Outside Diameter', 50, 100, 'label'), outside, inside] });
  assert.equal(result.populatedCount, 1);
  assert.equal(outside.node.textContent, '-');
  assert.equal(inside.node.textContent, '290 mm');
});

test('missing DB values clean configured placeholder text and can hide configured slot geometry without suppressing overlays', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = { sourceCode: 'Pipe1', confidenceThreshold: 0.85, slots: { OD: { semanticLabel: 'OD', displayLabel: 'OD', labelText: ['Outside Diameter'], preferredValueKeys: ['OD', 'dimensions.odMm'], format: 'diameter-mm', target: { targetBox: [900, 900, 1200, 1100], cleanupBox: [850, 850, 1250, 1150], geometryBox: [850, 850, 1250, 1150], hideGeometryWhenMissing: true, placeholderText: ['-'], cleanupPlaceholderText: ['-'] }, suppressOverlayLabels: ['OD'] } } };
  const inside = inventoryEntry('-', 1000, 1000, 'inside');
  const outside = inventoryEntry('-', 2000, 2000, 'outside');
  const dimensionLine = new ElementNode('line', { x1: '900', y1: '1000', x2: '1150', y2: '1000' });
  const outsideLine = new ElementNode('line', { x1: '2000', y1: '2000', x2: '2200', y2: '2000' });
  const root = new ElementNode('svg', {}, [dimensionLine, outsideLine]);
  const result = populateSvgSlots(root, 'Pipe1', binding, {}, { inventory: [inside, outside] });
  assert.equal(result.populatedCount, 0);
  assert.deepEqual(result.suppressedOverlayLabels, []);
  assert.equal(inside.node.textContent, '');
  assert.equal(outside.node.textContent, '-');
  assert.equal(inside.node.getAttribute('data-pipetools-placeholder-cleaned'), 'true');
  assert.equal(dimensionLine.getAttribute('display'), 'none');
  assert.equal(dimensionLine.getAttribute('data-pipetools-missing-slot-geometry-hidden'), 'true');
  assert.equal(outsideLine.getAttribute('display'), null);
  assert.equal(result.hiddenGeometryCount, 1);
  assert.equal(result.slots[0].hiddenGeometryCount, 1);
});

test('unmatched and missing-value slots do not suppress overlays', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = await readSlot('Pipe1');
  const failed = populateSvgSlots(new ElementNode('svg'), 'Pipe1', binding, pipeRow, { inventory: [inventoryEntry('Outside Diameter', 100, 100, 'outside-region')] });
  assert.equal(failed.populatedCount, 0);
  assert.deepEqual(failed.suppressedOverlayLabels, []);
  const partial = populateSvgSlots(new ElementNode('svg'), 'Pipe1', binding, { dimensions: { odMm: { value: 290 } } }, { inventory: inventoryFor(binding) });
  assert.deepEqual(partial.populatedLabels, ['OD']);
  assert.ok(!partial.suppressedOverlayLabels.includes('ID'));
});

test('Flan1 and Flan3 target-region fixtures populate source-backed values', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  for (const sourceCode of ['Flan1', 'Flan3']) {
    const binding = await readSlot(sourceCode);
    const inventory = [...inventoryFor(binding), inventoryEntry('-', 1, 1, 'outside')];
    const result = populateSvgSlots(new ElementNode('svg'), sourceCode, binding, flangeRow, { inventory });
    assert.ok(result.populatedLabels.includes('Flange OD'));
    assert.ok(result.populatedLabels.includes('PCD'));
    assert.ok(result.populatedLabels.includes('Weight'));
    assert.equal(inventory[inventory.length - 1].node.textContent, '-');
  }
});

test('validators pass for v2 slot bindings', async () => {
  await execFileAsync(process.execPath, [path.join(dxfRoot, 'validate-svg-slots.mjs')], { cwd: repoRoot });
  await execFileAsync(process.execPath, [path.join(dxfRoot, 'audit-svg-slot-coverage.mjs'), '--check'], { cwd: repoRoot });
});
