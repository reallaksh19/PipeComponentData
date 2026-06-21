import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPath = path.join(repoRoot, 'pipetools/symbols/dxf/dxf-symbol-manifest.json');
const dxfRoot = path.join(repoRoot, 'pipetools/symbols/dxf');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const symbols = manifest.symbols || [];

function symbolByCode(sourceCode) {
  return symbols.find((symbol) => symbol.sourceCode === sourceCode);
}

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
    clear: () => data.clear(),
  };
}

function setGlobalStorage(storage) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  return () => {
    if (previous) Object.defineProperty(globalThis, previous);
    else delete globalThis.localStorage;
  };
}

test('DXF manifest references real SVG files without executable payloads', async () => {
  assert.equal(manifest.schema, 'pipecomponentdata-dxf-symbol-manifest/v1');
  assert.ok(symbols.length >= 20, 'expected committed DXF-derived symbol set');
  const seen = new Set();
  for (const symbol of symbols) {
    assert.ok(symbol.sourceCode, `missing sourceCode for ${symbol.id}`);
    assert.ok(!seen.has(symbol.sourceCode), `duplicate sourceCode ${symbol.sourceCode}`);
    seen.add(symbol.sourceCode);
    assert.match(symbol.svg, /^symbols\//, `${symbol.sourceCode} must stay under symbols/`);
    const svgPath = path.join(dxfRoot, symbol.svg);
    assert.ok(existsSync(svgPath), `${symbol.sourceCode} SVG missing at ${symbol.svg}`);
    const svgText = await readFile(svgPath, 'utf8');
    assert.match(svgText, /<svg[\s>]/i, `${symbol.sourceCode} is not an SVG payload`);
    assert.doesNotMatch(svgText, /<script[\s>]/i, `${symbol.sourceCode} must not contain scripts`);
  }
});

test('dimension facts expose DB evidence paths and never manufacture dash values', async () => {
  const { dimensionFacts, formatFact, weightFacts } = await import('../pipetools/js/dimensionDisplay.js');
  const row = {
    componentType: 'VALVE',
    dimensions: { faceToFaceRfMm: { value: 178 }, heightMm: { value: 409 }, handwheelDiaMm: { value: 200 } },
    weights: { rfRtjKg: { value: 18 } },
  };
  const facts = [...dimensionFacts(row), ...weightFacts(row)];
  const byLabel = new Map(facts.map((fact) => [fact.label, fact]));
  assert.equal(byLabel.get('F2F RF')?.path, 'dimensions.faceToFaceRfMm');
  assert.equal(byLabel.get('Height')?.path, 'dimensions.heightMm');
  assert.equal(byLabel.get('HW dia')?.path, 'dimensions.handwheelDiaMm');
  assert.equal(byLabel.get('RF/RTJ weight')?.path, 'weights.rfRtjKg');
  assert.ok(facts.every((fact) => !/^[—–-]+$/.test(formatFact(fact))), 'facts must not emit placeholder dash values');
});

test('callout templates expose major engineering dimensions for key DXF families', async () => {
  const { calloutTemplateFields, requiredCalloutLabels } = await import('../pipetools/js/svg/dimensionCalloutTemplates.js');
  assert.deepEqual(requiredCalloutLabels(symbolByCode('Vlfl1')), ['F2F RF', 'Height', 'HW dia']);
  assert.ok(requiredCalloutLabels(symbolByCode('Flan1')).includes('OD'));
  assert.ok(requiredCalloutLabels(symbolByCode('Flan1')).includes('RF dia'));
  assert.ok(requiredCalloutLabels(symbolByCode('Gflt1')).includes('ID'));
  const flangeLabelGroups = calloutTemplateFields(symbolByCode('Flan1')).flatMap(([, labels]) => labels);
  assert.ok(flangeLabelGroups.includes('PCD'), 'flange template should still recognize PCD as an alternate diameter fact');
  const valveKinds = calloutTemplateFields(symbolByCode('Vlfl1')).map(([slot]) => slot);
  assert.ok(valveKinds.includes('lengthBottom'), 'valve needs horizontal dimension slot');
  assert.ok(valveKinds.includes('heightRight'), 'valve needs vertical dimension slot');
});

test('template callouts remain source-backed, suppressible, and placeholder-free', async () => {
  const { buildCallouts, calloutsForMode } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const flangeRow = {
    componentType: 'FLANGE',
    dimensions: { odMm: { value: 60 }, rfDiaMm: { value: 43 }, pcdMm: { value: 75 } },
    weights: { rfRtjKg: { value: 2 } },
  };
  const callouts = buildCallouts(flangeRow, symbolByCode('Flan1'), { suppressLabels: [] });
  assert.ok(callouts.length > 0, 'template fallback must produce DB-backed callouts');
  assert.ok(callouts.every((callout) => callout.source !== 'manual-anchor'));
  assert.ok(callouts.every((callout) => callout.factPath));
  assert.ok(callouts.every((callout) => !/(?:—|undefined|null)/i.test(`${callout.label} ${callout.value}`)));
  assert.ok(calloutsForMode(callouts, 'compact').length <= 4);

  const pipeRow = {
    componentType: 'PIPE',
    dimensions: { odMm: { value: 290 }, idMm: { value: 212 }, wallMm: { value: 39 } },
    weights: { weightKgPerM: { value: 84 } },
  };
  const suppressed = buildCallouts(pipeRow, symbolByCode('Pipe1'), { suppressLabels: ['OD', 'ID', 'Wall / Thk', 'Weight / m'] });
  assert.deepEqual(suppressed.map((callout) => callout.label), []);
});

test('callout mode cycles and persists without browser dependencies', async () => {
  const restoreStorage = setGlobalStorage(memoryStorage());
  try {
    const modeStore = await import('../pipetools/js/svg/dimensionCalloutModeStore.js');
    assert.equal(modeStore.getDimensionCalloutMode(), 'full');
    assert.equal(modeStore.cycleDimensionCalloutMode(), 'compact');
    assert.equal(modeStore.getDimensionCalloutMode(), 'compact');
    assert.equal(modeStore.cycleDimensionCalloutMode(), 'off');
    assert.equal(modeStore.dimensionCalloutModeLabel(), 'Callouts: Off');
    assert.equal(modeStore.setDimensionCalloutMode('invalid'), 'full');
  } finally {
    restoreStorage();
  }
});

test('Fix Offset save/export stores audited per-source viewport data', async () => {
  const restoreStorage = setGlobalStorage(memoryStorage());
  try {
    const offsets = await import('../pipetools/js/svg/sourceSvgOffsetStore.js');
    const saved = offsets.saveSourceSvgOffset('Vlfl1', { panX: '12px', panY: '-8px', scale: 1.12 });
    assert.equal(saved.panX, '12px');
    assert.equal(saved.panY, '-8px');
    assert.equal(saved.scale, 1.12);
    assert.equal(saved.source, 'browser-fix-button');
    const loaded = await offsets.loadSourceSvgOffset('Vlfl1');
    assert.equal(loaded.panX, '12px');
    const payload = offsets.exportSourceSvgOffsetsPayload();
    assert.equal(payload.schema, 'PipeToolsDxfSymbolOffsets.v1');
    assert.deepEqual(Object.keys(payload.offsets), ['Vlfl1']);
  } finally {
    restoreStorage();
  }
});

test('DXF validator scripts required by CI are committed', () => {
  assert.ok(existsSync(path.join(dxfRoot, 'validate-dxf-symbols.mjs')));
  assert.ok(existsSync(path.join(dxfRoot, 'validate-dxf-offsets.mjs')));
  assert.ok(existsSync(path.join(dxfRoot, 'validate-svg-slots.mjs')));
  assert.ok(existsSync(path.join(dxfRoot, 'audit-svg-slot-coverage.mjs')));
  assert.ok(existsSync(path.join(dxfRoot, 'audit-dxf-callout-coverage.mjs')));
});
