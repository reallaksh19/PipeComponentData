import assert from 'node:assert/strict';
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
    this.nodeType = 1;
  }
  append(child) {
    child.parentElement = this;
    child.parentNode = this;
    this.children.push(child);
  }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  querySelectorAll(selector = '') {
    const tags = String(selector).split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    const matches = [];
    const walk = (node) => {
      for (const child of node.children || []) {
        if (tags.includes(String(child.tagName || child.nodeName).toLowerCase())) matches.push(child);
        walk(child);
      }
    };
    walk(this);
    return matches;
  }
}

function inventoryEntry(text, x, y, path, node = new TestNode('text', {}, text)) {
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

function inventoryForPopulatedPipe1Slots(binding) {
  return ['OD', 'ID', 'Wall / Thk', 'Weight / m'].map((label, index) => {
    const slot = binding.slots[label];
    const [x1, y1, x2, y2] = slot.target.targetBox;
    const text = slot.target.allowedExistingText?.[0] || slot.labelText?.[0] || label;
    return inventoryEntry(text, (x1 + x2) / 2, (y1 + y2) / 2, `svg[1]/text[${index + 1}]`);
  });
}

test('Pipe1 missing Outside Radius clears native label and suppresses only its native scaffold', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const { suppressSvgSlotArtifacts } = await import('../pipetools/js/svg/svgSlotArtifactCleanup.js');
  const binding = JSON.parse(await readFile(pipe1SlotPath, 'utf8'));
  assert.equal(binding.slots['Outside Radius'].target.hideGeometryWhenMissing, false, 'cleanup-only radius must not use broad geometryBox hiding');

  const outsideRadiusTextNode = new TestNode('text', { x: '8641', y: '15021', 'font-size': '73' }, 'Outside Radius');
  const inventory = [
    ...inventoryForPopulatedPipe1Slots(binding),
    inventoryEntry('Outside Radius', 8900, 15000, 'svg[1]/text[outside-radius]', outsideRadiusTextNode),
  ];

  const outsideRadiusLine = new TestNode('line', { x1: '8355', y1: '14874', x2: '9457', y2: '14874', stroke: 'rgb(0,255,0)' });
  const outsideRadiusArrow = new TestNode('line', { x1: '8355', y1: '14491', x2: '8379', y2: '14578', stroke: 'rgb(0,255,0)' });
  const pipeRightEdge = new TestNode('line', { x1: '8012', y1: '14312', x2: '8012', y2: '13359', stroke: 'rgb(0,255,0)' });
  const unrelatedGreenLine = new TestNode('line', { x1: '5499', y1: '13632', x2: '6437', y2: '13632', stroke: 'rgb(0,255,0)' });
  const root = new TestNode('svg');
  for (const node of [outsideRadiusLine, outsideRadiusArrow, pipeRightEdge, unrelatedGreenLine]) root.append(node);

  const result = populateSvgSlots(root, 'Pipe1', binding, pipeRow, { inventory });
  const artifacts = suppressSvgSlotArtifacts(root, binding, result);

  assert.ok(result.missingLabels.includes('Outside Radius'));
  assert.equal(outsideRadiusTextNode.textContent, '');
  assert.equal(outsideRadiusTextNode.getAttribute('data-pipetools-placeholder-cleaned'), 'true');
  assert.equal(outsideRadiusLine.getAttribute('display'), 'none');
  assert.equal(outsideRadiusArrow.getAttribute('display'), 'none');
  assert.equal(pipeRightEdge.getAttribute('display'), null);
  assert.equal(unrelatedGreenLine.getAttribute('display'), null);
  assert.ok(artifacts.hiddenArtifactCount >= 2);
  assert.ok(result.hiddenArtifactCount >= 2);
  assert.ok(result.hiddenGeometryCount >= 2);
});
