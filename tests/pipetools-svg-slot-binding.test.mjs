import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
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
const symbols = manifest.symbols || [];
const manifestCodes = new Set(symbols.map((symbol) => symbol.sourceCode));

function symbolByCode(sourceCode) {
  return symbols.find((symbol) => symbol.sourceCode === sourceCode);
}

async function readSlot(sourceCode) {
  return JSON.parse(await readFile(path.join(slotsRoot, `${sourceCode}.json`), 'utf8'));
}

class FakeElement {
  constructor(tagName, text = '', attrs = {}) {
    this.tagName = tagName;
    this.nodeName = tagName;
    this.textContent = text;
    this.attributes = new Map(Object.entries(attrs).map(([key, value]) => [key, String(value)]));
    this.children = [];
    this.parentElement = null;
    this.parentNode = null;
    this.dataset = {};
    this.nodeType = 1;
  }

  append(child) {
    child.parentElement = this;
    child.parentNode = this;
    this.children.push(child);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this.dataset[key] = String(value);
    }
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const wanted = new Set(selector.split(',').map((item) => item.trim().toLowerCase()));
    const found = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (wanted.has(child.tagName.toLowerCase())) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
}

function fakeSvg(texts) {
  const svg = new FakeElement('svg');
  texts.forEach(([text, x, y, attrs = {}]) => svg.append(new FakeElement('text', text, { x, y, ...attrs })));
  return svg;
}

function targetTextFixture(binding, values = {}) {
  const svg = new FakeElement('svg');
  for (const [slotLabel, slot] of Object.entries(binding.slots)) {
    const [minX, minY, maxX, maxY] = slot.target.targetBox;
    const text = values[slotLabel] || slot.target.allowedExistingText?.[0] || slot.labelText[0] || slotLabel;
    svg.append(new FakeElement('text', text, { x: (minX + maxX) / 2 - 40, y: (minY + maxY) / 2 + 20 }));
  }
  return svg;
}

function textNode(svg, value) {
  return svg.querySelectorAll('text,tspan').find((node) => String(node.textContent).includes(value));
}

function pipeRow(overrides = {}) {
  return {
    componentType: 'PIPE',
    dimensions: { odMm: { value: 290 }, idMm: { value: 212 }, wallThicknessMm: { value: 39 }, ...(overrides.dimensions || {}) },
    weights: { weightKgPerM: { value: 84 }, ...(overrides.weights || {}) },
    ...overrides.root,
  };
}

function flangeRow() {
  return {
    componentType: 'FLANGE',
    dimensions: {
      flangeOdMm: { value: 150 },
      boreMm: { value: 80 },
      flangeThicknessMm: { value: 18 },
      rfDiaMm: { value: 92 },
      pcdMm: { value: 120 },
      boltCount: { value: 4 },
    },
    weights: { kg: { value: 3.7 } },
  };
}

test('text inventory builds stable entries with bbox and normalized text', async () => {
  const { buildSvgTextInventory } = await import('../pipetools/js/svg/svgTextInventory.js');
  const svg = new FakeElement('svg');
  const group = new FakeElement('g', '', { transform: 'translate(10 20)' });
  const text = new FakeElement('text', '', { x: 100, y: 200, class: 'dim-label' });
  const tspan = new FakeElement('tspan', 'Outside   Diameter', { 'font-size': 50 });
  text.append(tspan);
  group.append(text);
  svg.append(group);
  svg.append(new FakeElement('text', '-', { x: 300, y: 400 }));

  const inventory = buildSvgTextInventory(svg, {
    measureTextNode: (node) => node.textContent === '-' ? { x: 295, y: 380, width: 20, height: 40 } : null,
  });

  assert.equal(inventory.length, 2);
  const label = inventory.find((entry) => entry.text.includes('Outside'));
  assert.equal(label.normalizedText, 'outside diameter');
  assert.match(label.path, /^svg\[1\]\/g\[1\]\/text\[1\]\/tspan\[1\]$/);
  assert.equal(label.transform, 'translate(10 20)');
  assert.ok(label.bbox.width > 0);
  const dash = inventory.find((entry) => entry.text === '-');
  assert.deepEqual(dash.center, { x: 305, y: 400 });
});

test('slot binding files validate as v2 for Pipe1, Flan1, and Flan3', async () => {
  for (const sourceCode of ['Pipe1', 'Flan1', 'Flan3']) {
    const slotPath = path.join(slotsRoot, `${sourceCode}.json`);
    assert.ok(existsSync(slotPath), `${sourceCode} slot binding must exist`);
    const slot = await readSlot(sourceCode);
    assert.equal(slot.version, 'PipeToolsSvgSlotBinding.v2');
    assert.equal(slot.sourceCode, sourceCode);
    assert.equal(slot.strategy, 'populate-native-svg-text');
    assert.equal(slot.coordinateSpace, 'source-svg-viewBox');
    assert.ok(Object.keys(slot.slots).length > 0, `${sourceCode} must define slots`);
    assert.ok(manifestCodes.has(sourceCode), `${sourceCode} must exist in manifest`);
    for (const spec of Object.values(slot.slots)) {
      assert.ok(Array.isArray(spec.target.targetBox), 'v2 slots must define targetBox');
    }
  }
});

test('slot JSON contains no hardcoded DB values or final placeholders', async () => {
  for (const sourceCode of ['Pipe1', 'Flan1', 'Flan3']) {
    const text = await readFile(path.join(slotsRoot, `${sourceCode}.json`), 'utf8');
    assert.doesNotMatch(text, /\b\d+(?:\.\d+)?\s*(?:mm|kg|kg\s*\/\s*m|kg\/m)\b/i);
    assert.doesNotMatch(text, /"(?:value|displayValue|actualValue|dbValue)"\s*:/i);
    assert.doesNotMatch(text, /"(?:null|undefined)"/i);
  }
});

test('Pipe1 target-region binding populates intended native slots', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = await readSlot('Pipe1');
  const svg = targetTextFixture(binding);
  const result = populateSvgSlots(svg, 'Pipe1', binding, pipeRow());

  assert.deepEqual(result.populatedLabels, ['OD', 'ID', 'Wall / Thk', 'Weight / m']);
  assert.equal(result.populatedCount, 4);
  assert.equal(textNode(svg, '290 mm')?.getAttribute('data-pipetools-slot'), 'OD');
  assert.equal(textNode(svg, '212 mm')?.getAttribute('data-pipetools-source-backed'), 'true');
  assert.equal(textNode(svg, '39 mm')?.getAttribute('data-pipetools-slot-source-path'), 'dimensions.wallThicknessMm');
  assert.equal(textNode(svg, '84 kg/m')?.getAttribute('data-pipetools-slot'), 'Weight / m');
  assert.ok(result.slots.every((slot) => slot.status === 'populated' && slot.confidence >= 0.85 && slot.targetPath));
});

test('wrong nearest placeholder is not selected outside targetBox', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = {
    version: 'PipeToolsSvgSlotBinding.v2',
    sourceCode: 'Pipe1',
    strategy: 'populate-native-svg-text',
    coordinateSpace: 'source-svg-viewBox',
    confidenceThreshold: 0.85,
    slots: {
      OD: {
        semanticLabel: 'OD',
        displayLabel: 'OD',
        labelText: ['Outside Diameter'],
        preferredValueKeys: ['OD', 'dimensions.odMm'],
        format: 'diameter-mm',
        target: {
          targetBox: [900, 900, 1200, 1100],
          labelBox: [0, 0, 250, 150],
          placeholderText: ['-'],
          allowedExistingText: ['Outside Diameter'],
          maxDistanceFromLabel: 2000,
        },
        suppressOverlayLabels: ['OD'],
      },
    },
  };
  const svg = fakeSvg([
    ['Outside Diameter', 50, 100],
    ['-', 150, 100],
    ['-', 1000, 1000],
  ]);
  const result = populateSvgSlots(svg, 'Pipe1', binding, pipeRow({ dimensions: { odMm: { value: 290 } } }));
  assert.equal(result.populatedCount, 1);
  assert.equal(svg.querySelectorAll('text')[1].textContent, '-', 'near wrong dash must remain untouched');
  assert.equal(svg.querySelectorAll('text')[2].textContent, '290 mm', 'targetBox dash must be populated');
});

test('low-confidence failed slots do not suppress overlay fallback', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const binding = await readSlot('Pipe1');
  const svg = fakeSvg([
    ['Outside Diameter', 100, 100],
    ['-', 150, 100],
  ]);
  const result = populateSvgSlots(svg, 'Pipe1', binding, pipeRow());
  assert.equal(result.populatedCount, 0);
  assert.ok(result.slots.some((slot) => slot.slot === 'OD' && slot.status === 'not-populated'));
  assert.deepEqual(result.suppressedOverlayLabels, []);
  const callouts = buildCallouts(pipeRow(), symbolByCode('Pipe1'), { suppressLabels: result.suppressedOverlayLabels });
  assert.ok(callouts.some((callout) => callout.label === 'OD'), 'failed OD slot must fall back to overlay callout');
});

test('overlay suppression occurs only for populated high-confidence slots', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const binding = await readSlot('Pipe1');
  const odBox = binding.slots.OD.target.targetBox;
  const svg = fakeSvg([
    ['Outside Diameter', (odBox[0] + odBox[2]) / 2, (odBox[1] + odBox[3]) / 2],
  ]);
  const result = populateSvgSlots(svg, 'Pipe1', { ...binding, slots: { OD: binding.slots.OD, 'Wall / Thk': binding.slots['Wall / Thk'] } }, pipeRow());
  assert.deepEqual(result.populatedLabels, ['OD']);
  assert.ok(result.suppressedOverlayLabels.includes('OD'));
  assert.ok(!result.suppressedOverlayLabels.includes('Wall / Thk'));
  const callouts = buildCallouts(pipeRow(), symbolByCode('Pipe1'), { suppressLabels: result.suppressedOverlayLabels });
  assert.ok(!callouts.some((callout) => callout.label === 'OD'));
  assert.ok(callouts.some((callout) => callout.label === 'Wall / Thk'));
});

test('missing DB values do not populate slots or emit placeholder strings', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = await readSlot('Pipe1');
  const svg = targetTextFixture(binding);
  const result = populateSvgSlots(svg, 'Pipe1', binding, { componentType: 'PIPE', dimensions: { odMm: { value: 290 } } });
  assert.deepEqual(result.populatedLabels, ['OD']);
  assert.ok(result.missingLabels.includes('ID'));
  assert.equal(textNode(svg, 'undefined'), undefined);
  assert.equal(textNode(svg, String.fromCharCode(8212)), undefined);
  assert.ok(!result.suppressedOverlayLabels.includes('ID'));
});

test('missing slot binding safely falls back to existing template callout behavior', async () => {
  const slotStore = await import('../pipetools/js/svg/svgSlotBindingStore.js');
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const previousFetch = globalThis.fetch;
  let fetchCount = 0;
  slotStore.clearSvgSlotBindingCache();
  globalThis.fetch = async () => {
    fetchCount += 1;
    return { ok: false, status: 404, statusText: 'Not Found' };
  };
  try {
    assert.equal(await slotStore.loadSvgSlotBinding('Vlfl1'), null);
    assert.equal(await slotStore.loadSvgSlotBinding('Vlfl1'), null);
    assert.equal(fetchCount, 1, 'failed slot lookups should be cached');
  } finally {
    globalThis.fetch = previousFetch;
    slotStore.clearSvgSlotBindingCache();
  }
  const callouts = buildCallouts({ dimensions: { faceToFaceRfMm: { value: 178 }, heightMm: { value: 409 } } }, symbolByCode('Vlfl1'), { suppressLabels: [] });
  assert.ok(callouts.length > 0, 'template fallback should remain available for unbound symbols');
});

test('Flan1 and Flan3 populate only configured targetBox source-backed facts', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  for (const sourceCode of ['Flan1', 'Flan3']) {
    const binding = await readSlot(sourceCode);
    const svg = targetTextFixture(binding);
    svg.append(new FakeElement('text', '-', { x: 1, y: 1 }));
    const result = populateSvgSlots(svg, sourceCode, binding, flangeRow());
    assert.ok(result.populatedLabels.includes('Flange OD'));
    assert.ok(result.populatedLabels.includes('RF dia'));
    assert.ok(result.populatedLabels.includes('PCD'));
    assert.ok(result.populatedLabels.includes('Bolts'));
    assert.ok(result.populatedLabels.includes('Weight'));
    assert.equal(textNode(svg, '3.7 kg')?.getAttribute('data-pipetools-slot'), 'Weight');
    const allText = svg.querySelectorAll('text');
    assert.equal(allText[allText.length - 1].textContent, '-', 'out-of-region dash must not be replaced');
  }
});

test('full and compact modes affect overlay fallback only', async () => {
  const { buildCallouts, calloutsForMode } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const row = { dimensions: { faceToFaceRfMm: { value: 178 }, heightMm: { value: 409 }, handwheelDiaMm: { value: 200 } } };
  const callouts = buildCallouts(row, symbolByCode('Vlfl1'), { suppressLabels: [] });
  assert.ok(calloutsForMode(callouts, 'full').length >= calloutsForMode(callouts, 'compact').length);
  assert.ok(calloutsForMode(callouts, 'compact').length <= 4);
  assert.deepEqual(calloutsForMode(callouts, 'off'), callouts.slice(0, 8), 'off mode is handled by renderDimensionCallouts before layout');
});

test('SVG slot validators pass', async () => {
  await execFileAsync(process.execPath, [path.join(dxfRoot, 'validate-svg-slots.mjs')], { cwd: repoRoot });
  await execFileAsync(process.execPath, [path.join(dxfRoot, 'audit-svg-slot-coverage.mjs'), '--check'], { cwd: repoRoot });
});

test('manual anchor artifacts are not reintroduced', async () => {
  assert.equal(existsSync(path.join(repoRoot, 'pipetools/js/svg/symbolAnchorStore.js')), false);
  assert.equal(existsSync(path.join(repoRoot, 'tests/pipetools-symbol-anchor-expansion.test.mjs')), false);
  const engine = await readFile(path.join(repoRoot, 'pipetools/js/svg/dxfSymbolEngine.js'), 'utf8');
  assert.doesNotMatch(engine, /symbolAnchorStore|validate-symbol-anchors|audit-symbol-anchor-coverage/);
});
