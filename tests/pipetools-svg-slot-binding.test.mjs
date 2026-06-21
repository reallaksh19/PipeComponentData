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
  }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) || null; }
  querySelectorAll() { return []; }
}

class ElementNode extends TextNode {
  constructor(tagName, attrs = {}, children = []) {
    super('', attrs);
    this.tagName = tagName;
    this.nodeName = tagName;
    this.children = [];
    children.forEach((child) => this.append(child));
  }
  append(child) {
    child.parentElement = this;
    child.parentNode = this;
    this.children.push(child);
  }
  querySelectorAll() {
    const out = [];
    const walk = (node) => {
      for (const child of node.children || []) {
        if (String(child.tagName).toLowerCase() === 'text' || String(child.tagName).toLowerCase() === 'tspan') out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
}

function inventoryEntry(text, x, y, path) {
  const node = new TextNode(text);
  return { path, node, text, normalizedText: String(text).toLowerCase(), rawText: text, x, y, bbox: { x, y, width: 10, height: 10 }, center: { x, y }, tagName: 'text', parentPath: 'svg[1]', transform: '', className: '', style: '' };
}

function inventoryFor(binding) {
  return Object.entries(binding.slots).map(([label, slot], index) => {
    const [x1, y1, x2, y2] = slot.target.targetBox;
    const text = slot.target.allowedExistingText?.[0] || slot.labelText[0] || label;
    return inventoryEntry(text, (x1 + x2) / 2, (y1 + y2) / 2, `svg[1]/text[${index + 1}]`);
  });
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

test('text inventory accepts measured text nodes', async () => {
  const { buildSvgTextInventory } = await import('../pipetools/js/svg/svgTextInventory.js');
  const node = new TextNode('Outside Diameter');
  const root = { nodeType: 1, querySelectorAll: () => [node] };
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

test('Pipe1 slots populate target-region text only', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = await readSlot('Pipe1');
  const inventory = inventoryFor(binding);
  const result = populateSvgSlots(new TextNode('svg'), 'Pipe1', binding, pipeRow, { inventory });
  assert.deepEqual(result.populatedLabels, ['OD', 'ID', 'Wall / Thk', 'Weight / m']);
  const od = inventory.find((entry) => entry.node.textContent === '290 mm' && entry.node.getAttribute('data-pipetools-slot') === 'OD')?.node;
  const weight = inventory.find((entry) => entry.node.textContent === '84 kg/m' && entry.node.getAttribute('data-pipetools-slot') === 'Weight / m')?.node;
  assert.ok(od);
  assert.ok(weight);
  assert.equal(od.getAttribute('data-pipetools-native-value'), 'true');
  assert.equal(od.getAttribute('data-pipetools-source-backed'), 'true');
  assert.equal(od.getAttribute('font-weight'), '800');
  assert.ok(Number(od.getAttribute('font-size')) >= 260);
  assert.equal(weight.getAttribute('paint-order'), 'stroke fill');
  assert.ok(result.slots.every((slot) => slot.status === 'populated' && slot.confidence >= 0.85));
});

test('a candidate outside targetBox is not selected', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = { sourceCode: 'Pipe1', confidenceThreshold: 0.85, slots: { OD: { semanticLabel: 'OD', displayLabel: 'OD', labelText: ['Outside Diameter'], preferredValueKeys: ['OD', 'dimensions.odMm'], format: 'diameter-mm', target: { targetBox: [900, 900, 1200, 1100], labelBox: [0, 0, 250, 150], placeholderText: ['-'], maxDistanceFromLabel: 2000 }, suppressOverlayLabels: ['OD'] } } };
  const outside = inventoryEntry('-', 150, 100, 'outside');
  const inside = inventoryEntry('-', 1000, 1000, 'inside');
  const result = populateSvgSlots(new TextNode('svg'), 'Pipe1', binding, pipeRow, { inventory: [inventoryEntry('Outside Diameter', 50, 100, 'label'), outside, inside] });
  assert.equal(result.populatedCount, 1);
  assert.equal(outside.node.textContent, '-');
  assert.equal(inside.node.textContent, '290 mm');
});

test('unmatched and missing-value slots do not suppress overlays', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = await readSlot('Pipe1');
  const failed = populateSvgSlots(new TextNode('svg'), 'Pipe1', binding, pipeRow, { inventory: [inventoryEntry('Outside Diameter', 100, 100, 'outside-region')] });
  assert.equal(failed.populatedCount, 0);
  assert.deepEqual(failed.suppressedOverlayLabels, []);
  const partial = populateSvgSlots(new TextNode('svg'), 'Pipe1', binding, { dimensions: { odMm: { value: 290 } } }, { inventory: inventoryFor(binding) });
  assert.deepEqual(partial.populatedLabels, ['OD']);
  assert.ok(!partial.suppressedOverlayLabels.includes('ID'));
});

test('Flan1 and Flan3 target-region fixtures populate source-backed values', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  for (const sourceCode of ['Flan1', 'Flan3']) {
    const binding = await readSlot(sourceCode);
    const inventory = [...inventoryFor(binding), inventoryEntry('-', 1, 1, 'outside')];
    const result = populateSvgSlots(new TextNode('svg'), sourceCode, binding, flangeRow, { inventory });
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
