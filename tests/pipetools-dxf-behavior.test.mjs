import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
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
  assert.ok(requiredCalloutLabels(symbolByCode('Flan1')).includes('PCD'));
  assert.ok(requiredCalloutLabels(symbolByCode('Gflt1')).includes('ID'));
  const valveKinds = calloutTemplateFields(symbolByCode('Vlfl1')).map(([slot]) => slot);
  assert.ok(valveKinds.includes('lengthBottom'), 'valve needs horizontal dimension slot');
  assert.ok(valveKinds.includes('heightRight'), 'valve needs vertical dimension slot');
});

test('callout mode cycles and persists without browser dependencies', async () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = memoryStorage();
  try {
    const modeStore = await import('../pipetools/js/svg/dimensionCalloutModeStore.js');
    assert.equal(modeStore.getDimensionCalloutMode(), 'full');
    assert.equal(modeStore.cycleDimensionCalloutMode(), 'compact');
    assert.equal(modeStore.getDimensionCalloutMode(), 'compact');
    assert.equal(modeStore.cycleDimensionCalloutMode(), 'off');
    assert.equal(modeStore.dimensionCalloutModeLabel(), 'Callouts: Off');
    assert.equal(modeStore.setDimensionCalloutMode('invalid'), 'full');
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test('Fix Offset save/export stores audited per-source viewport data', async () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = memoryStorage();
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
    globalThis.localStorage = previousStorage;
  }
});

test('DXF validators and callout audit scripts execute successfully', async () => {
  const commands = [
    ['pipetools/symbols/dxf/validate-dxf-symbols.mjs'],
    ['pipetools/symbols/dxf/validate-dxf-offsets.mjs'],
    ['pipetools/symbols/dxf/audit-dxf-callout-coverage.mjs', '--check'],
  ];
  for (const args of commands) {
    const { stdout } = await execFileAsync(process.execPath, args, { cwd: repoRoot, timeout: 30000 });
    assert.ok(stdout.trim().length > 0, `${args.join(' ')} should produce audit output`);
  }
});
