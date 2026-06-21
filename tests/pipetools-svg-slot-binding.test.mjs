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
  texts.forEach(([text, x, y]) => svg.append(new FakeElement('text', text, { x, y })));
  return svg;
}

function textNode(svg, value) {
  return svg.querySelectorAll('text').find((node) => node.textContent.includes(value));
}

test('slot binding files validate for Pipe1, Flan1, and Flan3', async () => {
  for (const sourceCode of ['Pipe1', 'Flan1', 'Flan3']) {
    const slotPath = path.join(slotsRoot, `${sourceCode}.json`);
    assert.ok(existsSync(slotPath), `${sourceCode} slot binding must exist`);
    const slot = await readSlot(sourceCode);
    assert.equal(slot.version, 'PipeToolsSvgSlotBinding.v1');
    assert.equal(slot.sourceCode, sourceCode);
    assert.equal(slot.strategy, 'populate-native-svg-text');
    assert.ok(Object.keys(slot.slots).length > 0, `${sourceCode} must define slots`);
    assert.ok(manifestCodes.has(sourceCode), `${sourceCode} must exist in manifest`);
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

test('Pipe1 SVG slot population writes source-backed values into native text nodes', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = await readSlot('Pipe1');
  const svg = fakeSvg([
    ['Outside Diameter', 100, 100], ['-', 270, 100],
    ['Inside Diameter', 100, 200], ['-', 270, 200],
    ['Wall Thickness', 100, 300], ['-', 270, 300],
    ['Weight', 100, 400], ['Kg/Mtr', 270, 400],
  ]);
  const row = {
    componentType: 'PIPE',
    dimensions: { odMm: { value: 290 }, idMm: { value: 212 }, wallThicknessMm: { value: 39 } },
    weights: { weightKgPerM: { value: 84 } },
  };

  const result = populateSvgSlots(svg, 'Pipe1', binding, row);
  assert.deepEqual(result.populatedLabels, ['OD', 'ID', 'Wall / Thk', 'Weight / m']);
  assert.equal(result.populatedCount, 4);
  assert.equal(textNode(svg, '290 mm')?.getAttribute('data-pipetools-slot'), 'OD');
  assert.equal(textNode(svg, '212 mm')?.getAttribute('data-pipetools-source-backed'), 'true');
  assert.equal(textNode(svg, '39 mm')?.getAttribute('data-pipetools-fact-path'), 'dimensions.wallThicknessMm');
  assert.equal(textNode(svg, '84 kg/m')?.getAttribute('data-pipetools-slot'), 'Weight / m');
});

test('Pipe1 populated native slots suppress duplicate overlay callouts', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const binding = await readSlot('Pipe1');
  const svg = fakeSvg([
    ['Outside Diameter', 100, 100], ['-', 270, 100],
    ['Inside Diameter', 100, 200], ['-', 270, 200],
    ['Wall Thickness', 100, 300], ['-', 270, 300],
    ['Weight', 100, 400], ['Kg/Mtr', 270, 400],
  ]);
  const row = {
    componentType: 'PIPE',
    dimensions: { odMm: { value: 290 }, idMm: { value: 212 }, wallThicknessMm: { value: 39 } },
    weights: { weightKgPerM: { value: 84 } },
  };
  const slots = populateSvgSlots(svg, 'Pipe1', binding, row);
  const callouts = buildCallouts(row, symbolByCode('Pipe1'), { suppressLabels: slots.suppressedOverlayLabels });
  assert.deepEqual(callouts.map((callout) => callout.label), []);
});

test('missing DB values do not populate slots or emit placeholder strings', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  const binding = await readSlot('Pipe1');
  const svg = fakeSvg([
    ['Outside Diameter', 100, 100], ['-', 270, 100],
    ['Inside Diameter', 100, 200], ['-', 270, 200],
  ]);
  const result = populateSvgSlots(svg, 'Pipe1', binding, { componentType: 'PIPE', dimensions: { odMm: { value: 290 } } });
  assert.deepEqual(result.populatedLabels, ['OD']);
  assert.ok(result.missingLabels.includes('ID'));
  assert.equal(textNode(svg, 'undefined'), undefined);
  assert.equal(textNode(svg, '—'), undefined);
});

test('missing slot binding safely falls back to existing template callout behavior', async () => {
  const slotStore = await import('../pipetools/js/svg/svgSlotBindingStore.js');
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const previousFetch = globalThis.fetch;
  let fetchCount = 0;
  slotStore.clearSvgSlotBindingCache();
  globalThis.fetch = async () => {
    fetchCount += 1;
    return new Response('', { status: 404, statusText: 'Not Found' });
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

test('Flan1 and Flan3 populate only source-backed flange facts', async () => {
  const { populateSvgSlots } = await import('../pipetools/js/svg/svgSlotPopulator.js');
  for (const sourceCode of ['Flan1', 'Flan3']) {
    const binding = await readSlot(sourceCode);
    const svg = fakeSvg([
      ['OD', 100, 100], ['-', 260, 100],
      ['RF dia', 100, 200], ['-', 260, 200],
      ['PCD', 100, 300], ['-', 260, 300],
      ['Bolts', 100, 400], ['-', 260, 400],
      ['Weight', 100, 500], ['kg', 260, 500],
    ]);
    const row = {
      componentType: 'FLANGE',
      dimensions: { flangeOdMm: { value: 150 }, rfDiaMm: { value: 92 }, pcdMm: { value: 120 }, boltCount: { value: 4 } },
      weights: { kg: { value: 3.7 } },
    };
    const result = populateSvgSlots(svg, sourceCode, binding, row);
    assert.ok(result.populatedLabels.includes('Flange OD'));
    assert.ok(result.populatedLabels.includes('RF dia'));
    assert.ok(result.populatedLabels.includes('PCD'));
    assert.ok(result.populatedLabels.includes('Bolts'));
    assert.ok(result.populatedLabels.includes('Weight'));
    assert.equal(textNode(svg, '3.7 kg')?.getAttribute('data-pipetools-slot'), 'Weight');
  }
});

test('overlay full and compact modes continue to filter fallback callouts', async () => {
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
