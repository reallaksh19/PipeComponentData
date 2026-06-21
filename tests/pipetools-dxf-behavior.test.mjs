import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPath = path.join(repoRoot, 'pipetools/symbols/dxf/dxf-symbol-manifest.json');
const dxfRoot = path.join(repoRoot, 'pipetools/symbols/dxf');
const pipe1AnchorPath = path.join(dxfRoot, 'anchors/Pipe1.json');
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
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  };
}

async function readPipe1Anchor() {
  return JSON.parse(await readFile(pipe1AnchorPath, 'utf8'));
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

test('DXF resolver maps real normalized-style rows and rejects unsupported rows', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const textUrl = String(url);
    if (textUrl.endsWith('/dxf-symbol-manifest.json')) {
      return new Response(JSON.stringify(manifest), { status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`unexpected fetch in resolver test: ${textUrl}`);
  };
  try {
    const { resolveDxfSymbolForComponent } = await import('../pipetools/js/svg/dxfSymbolEngine.js');
    const valve = await resolveDxfSymbolForComponent({ componentType: 'VALVE', valveType: 'GATE', endType: 'FLANGED', standard: 'ASME B16.10', nps: '2' });
    assert.equal(valve.status, 'OK');
    assert.equal(valve.sourceCode, 'Vlfl1');
    assert.equal(valve.symbol.title, 'Flanged Gate Valve');

    const unsupported = await resolveDxfSymbolForComponent({ componentType: 'SUPPORT', supportKind: 'HANGER', standard: 'PROJECT' });
    assert.equal(unsupported.status, 'SVG_NOT_AVAILABLE');
    assert.match(unsupported.reason, /No DXF manifest mapping/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('dimension facts expose DB evidence paths and never manufacture dash values', async () => {
  const { dimensionFacts, formatFact, weightFacts } = await import('../pipetools/js/dimensionDisplay.js');
  const row = {
    componentType: 'VALVE',
    dimensions: {
      faceToFaceRfMm: { value: 178 },
      heightMm: { value: 409 },
      handwheelDiaMm: { value: 200 },
    },
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

test('Pipe1 manual anchor file exists and defines required semantic anchors', async () => {
  assert.ok(existsSync(pipe1AnchorPath), 'Pipe1 anchor JSON must be committed');
  const rawAnchor = await readPipe1Anchor();
  assert.equal(rawAnchor.version, 'PipeToolsSymbolAnchor.v1');
  assert.equal(rawAnchor.sourceCode, 'Pipe1');
  assert.deepEqual(Object.keys(rawAnchor.anchors), ['OD', 'ID', 'Wall / Thk', 'Weight / m']);
  assert.equal(rawAnchor.anchors['Wall / Thk'].kind, 'leader');
  assert.equal(rawAnchor.anchors['Weight / m'].kind, 'badge');
});

test('Pipe1 manual anchor JSON contains no embedded DB values or placeholders', async () => {
  const text = await readFile(pipe1AnchorPath, 'utf8');
  assert.doesNotMatch(text, /17\.1\s*mm|12\.48\s*mm|2\.31\s*mm|0\.84\s*kg\s*\/\s*m/i);
  assert.doesNotMatch(text, /"(?:value|displayValue|actualValue|dbValue)"\s*:/i);
  assert.doesNotMatch(text, /"(?:—|–|-|null|undefined)"/i);
});

test('Pipe1 callout generation uses manual anchor geometry before template fallback', async () => {
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const { normalizeSymbolAnchor } = await import('../pipetools/js/svg/symbolAnchorStore.js');
  const anchor = normalizeSymbolAnchor(await readPipe1Anchor());
  const row = {
    componentType: 'PIPE',
    dimensions: {
      odMm: { value: 290 },
      idMm: { value: 212 },
      wallThicknessMm: { value: 39 },
    },
    weights: { weightKgPerM: { value: 84 } },
  };
  const callouts = buildCallouts(row, symbolByCode('Pipe1'), { anchor });
  const byLabel = new Map(callouts.map((callout) => [callout.label, callout]));

  assert.equal(byLabel.get('OD')?.source, 'manual-anchor');
  assert.equal(byLabel.get('ID')?.source, 'manual-anchor');
  assert.equal(byLabel.get('Wall / Thk')?.source, 'manual-anchor');
  assert.equal(byLabel.get('Weight / m')?.source, 'manual-anchor');
  assert.equal(byLabel.get('Wall / Thk')?.slot.kind, 'leader');
  assert.equal(byLabel.get('Weight / m')?.slot.kind, 'badge');
  assert.equal(byLabel.get('Weight / m')?.arrow, false);
  assert.equal(byLabel.get('Wall / Thk')?.factPath, 'dimensions.wallThicknessMm');
  assert.equal(byLabel.get('Wall / Thk')?.slot.x2, 485);
  assert.ok(Math.abs(byLabel.get('Wall / Thk').slot.y2 - (275 / 720 * 1000)) < 0.001, 'wall leader arrowhead must map to the pipe-wall anchor point');
});

test('manual anchors do not duplicate template labels and preserve compact filtering', async () => {
  const { buildCallouts, calloutsForMode } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const { normalizeSymbolAnchor } = await import('../pipetools/js/svg/symbolAnchorStore.js');
  const anchor = normalizeSymbolAnchor(await readPipe1Anchor());
  const row = {
    componentType: 'PIPE',
    dimensions: { odMm: { value: 290 }, idMm: { value: 212 }, wallMm: { value: 39 } },
    weights: { weightKgPerM: { value: 84 } },
  };
  const callouts = buildCallouts(row, symbolByCode('Pipe1'), { anchor });
  const labels = callouts.map((callout) => callout.label);
  assert.equal(labels.filter((label) => label === 'OD').length, 1);
  assert.equal(labels.filter((label) => label === 'Wall / Thk').length, 1);
  assert.equal(calloutsForMode(callouts, 'full').length, callouts.length);
  assert.ok(calloutsForMode(callouts, 'compact').length <= 4);
});

test('missing anchor files are cached safe failures and template fallback still works', async () => {
  const anchorStore = await import('../pipetools/js/svg/symbolAnchorStore.js');
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const previousFetch = globalThis.fetch;
  let fetchCount = 0;
  anchorStore.clearSymbolAnchorCache();
  globalThis.fetch = async () => {
    fetchCount += 1;
    return new Response('', { status: 404, statusText: 'Not Found' });
  };
  try {
    assert.equal(await anchorStore.loadSymbolAnchor('Flan1'), null);
    assert.equal(await anchorStore.loadSymbolAnchor('Flan1'), null);
    assert.equal(fetchCount, 1, 'failed anchor lookups should be cached');
  } finally {
    globalThis.fetch = previousFetch;
    anchorStore.clearSymbolAnchorCache();
  }

  const callouts = buildCallouts({ dimensions: { odMm: { value: 60 }, rfDiaMm: { value: 43 } }, weights: { rfRtjKg: { value: 2 } } }, symbolByCode('Flan1'), { anchor: null });
  assert.ok(callouts.length > 0, 'template fallback must still produce DB-backed callouts');
  assert.ok(callouts.every((callout) => callout.source !== 'manual-anchor'));
});

test('missing DB values do not produce placeholder callouts', async () => {
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const { normalizeSymbolAnchor } = await import('../pipetools/js/svg/symbolAnchorStore.js');
  const anchor = normalizeSymbolAnchor(await readPipe1Anchor());
  const callouts = buildCallouts({ componentType: 'PIPE', dimensions: { odMm: { value: 290 } } }, symbolByCode('Pipe1'), { anchor });
  assert.deepEqual(callouts.map((callout) => callout.label), ['OD']);
  assert.ok(callouts.every((callout) => !/(?:—|undefined|null)/i.test(`${callout.label} ${callout.value}`)));
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
  assert.ok(existsSync(path.join(dxfRoot, 'validate-symbol-anchors.mjs')));
  assert.ok(existsSync(path.join(dxfRoot, 'audit-dxf-callout-coverage.mjs')));
});
