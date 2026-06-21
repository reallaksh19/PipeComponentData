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
const manifestPath = path.join(repoRoot, 'pipetools/symbols/dxf/dxf-symbol-manifest.json');
const anchorDir = path.join(repoRoot, 'pipetools/symbols/dxf/anchors');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const symbols = manifest.symbols || [];
const sourceCodes = new Set(symbols.map((symbol) => symbol.sourceCode).filter(Boolean));
const SUPPORTED_KINDS = new Set(['diameter', 'leader', 'badge']);
const GASKET_CODES = ['Gflt1', 'Gspr1', 'Grtj1'];
const FLANGE_CODES = ['Flan1', 'Flan2', 'Flan3', 'FLAP1'];
const BLANK_CODES = ['Blnu1'];
const PHASE2_CODES = [...GASKET_CODES, ...FLANGE_CODES, ...BLANK_CODES].filter((sourceCode) => sourceCodes.has(sourceCode));

function symbolByCode(sourceCode) {
  return symbols.find((symbol) => symbol.sourceCode === sourceCode);
}

function anchorPath(sourceCode) {
  return path.join(anchorDir, `${sourceCode}.json`);
}

async function readAnchor(sourceCode) {
  return JSON.parse(await readFile(anchorPath(sourceCode), 'utf8'));
}

async function normalizedAnchor(sourceCode) {
  const { normalizeSymbolAnchor } = await import('../pipetools/js/svg/symbolAnchorStore.js');
  const anchor = normalizeSymbolAnchor(await readAnchor(sourceCode));
  assert.ok(anchor, `${sourceCode} anchor must normalize`);
  return anchor;
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

async function assertAnchorShape(sourceCode, expectedLabels) {
  assert.ok(existsSync(anchorPath(sourceCode)), `${sourceCode} anchor JSON must exist`);
  const anchor = await readAnchor(sourceCode);
  assert.equal(anchor.version, 'PipeToolsSymbolAnchor.v1');
  assert.equal(anchor.sourceCode, sourceCode);
  assert.deepEqual(Object.keys(anchor.anchors), expectedLabels);
  for (const [label, spec] of Object.entries(anchor.anchors)) {
    assert.ok(SUPPORTED_KINDS.has(spec.kind), `${sourceCode}.${label} kind must be renderer-supported`);
    if (Object.hasOwn(spec, 'preferredValueKeys')) {
      assert.ok(Array.isArray(spec.preferredValueKeys), `${sourceCode}.${label} preferredValueKeys must be an array`);
      assert.ok(spec.preferredValueKeys.length > 0, `${sourceCode}.${label} preferredValueKeys must not be empty`);
      assert.ok(spec.preferredValueKeys.every((item) => typeof item === 'string' && item.trim()), `${sourceCode}.${label} preferredValueKeys must contain only non-empty strings`);
    }
  }
}

test('Pipe1 anchor still exists with original semantic anchors', async () => {
  await assertAnchorShape('Pipe1', ['OD', 'ID', 'Wall / Thk', 'Weight / m']);
  const pipe = await readAnchor('Pipe1');
  assert.equal(pipe.anchors['Wall / Thk'].kind, 'leader');
  assert.equal(pipe.anchors['Weight / m'].kind, 'badge');
});

test('Phase 2 gasket anchor files validate when sourceCodes exist in manifest', async () => {
  for (const sourceCode of GASKET_CODES.filter((item) => sourceCodes.has(item))) {
    await assertAnchorShape(sourceCode, ['OD', 'ID', 'Thickness', 'Weight']);
    const anchor = await readAnchor(sourceCode);
    assert.equal(anchor.anchors.Weight.kind, 'badge', `${sourceCode} weight must be a badge`);
  }
});

test('Phase 2 flange anchor files validate when sourceCodes exist in manifest', async () => {
  for (const sourceCode of FLANGE_CODES.filter((item) => sourceCodes.has(item))) {
    const expected = sourceCode === 'Flan3'
      ? ['OD', 'Thickness', 'RF', 'PCD', 'Bolts', 'Weight']
      : ['OD', 'Bore', 'Thickness', 'RF', 'PCD', 'Bolts', 'Weight'];
    await assertAnchorShape(sourceCode, expected);
    const anchor = await readAnchor(sourceCode);
    assert.equal(anchor.anchors.Weight.kind, 'badge', `${sourceCode} weight must be a badge`);
    assert.equal(anchor.anchors.Bolts.kind, 'badge', `${sourceCode} bolts must be a badge`);
  }
});

test('blind or line-blank anchor validates when sourceCode exists in manifest', async () => {
  for (const sourceCode of BLANK_CODES.filter((item) => sourceCodes.has(item))) {
    await assertAnchorShape(sourceCode, ['OD', 'Thickness', 'Paddle Length', 'Weight']);
    const anchor = await readAnchor(sourceCode);
    assert.equal(anchor.anchors.Weight.kind, 'badge');
    assert.equal(anchor.anchors['Paddle Length'].kind, 'badge');
  }
});

test('anchor files contain no hardcoded DB values, unit strings, placeholders, or DB value fields', async () => {
  const files = ['Pipe1', ...PHASE2_CODES].map(anchorPath);
  for (const filePath of files) {
    const text = await readFile(filePath, 'utf8');
    assert.doesNotMatch(text, /\b\d+(?:\.\d+)?\s*(?:mm|kg\s*\/\s*m|kg|inch|in\b|\")/i, `${path.basename(filePath)} must not embed dimension or weight text`);
    assert.doesNotMatch(text, /"(?:value|displayValue|actualValue|dbValue)"\s*:/i, `${path.basename(filePath)} must not contain DB value fields`);
    assert.doesNotMatch(text, /"(?:—|–|-|null|undefined)"/i, `${path.basename(filePath)} must not contain placeholder strings`);
  }
});

test('anchor files reference only manifest sourceCodes and have unique labels', async () => {
  for (const sourceCode of ['Pipe1', ...PHASE2_CODES]) {
    const anchor = await readAnchor(sourceCode);
    assert.ok(sourceCodes.has(anchor.sourceCode), `${sourceCode} must exist in manifest`);
    assert.equal(anchor.sourceCode, sourceCode);
    const labels = Object.keys(anchor.anchors || {});
    assert.equal(new Set(labels).size, labels.length, `${sourceCode} anchor labels must be unique`);
  }
});

test('all committed anchor kinds are supported by the renderer', async () => {
  for (const sourceCode of ['Pipe1', ...PHASE2_CODES]) {
    const anchor = await readAnchor(sourceCode);
    for (const [label, spec] of Object.entries(anchor.anchors || {})) {
      assert.ok(SUPPORTED_KINDS.has(spec.kind), `${sourceCode}.${label} uses unsupported kind ${spec.kind}`);
    }
  }
});

test('gasket anchors generate only DB-backed callouts', async () => {
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  for (const sourceCode of GASKET_CODES.filter((item) => sourceCodes.has(item))) {
    const anchor = await normalizedAnchor(sourceCode);
    const callouts = buildCallouts({
      componentType: 'GASKET',
      dimensions: {
        odMm: { value: 150 },
        idMm: { value: 100 },
        thicknessMm: { value: 4 },
      },
      weights: { kg: { value: 1.5 } },
    }, symbolByCode(sourceCode), { anchor });
    const byAnchorLabel = new Map(callouts.map((callout) => [callout.anchorLabel, callout]));
    assert.equal(byAnchorLabel.get('OD')?.source, 'manual-anchor');
    assert.equal(byAnchorLabel.get('ID')?.source, 'manual-anchor');
    assert.equal(byAnchorLabel.get('Thickness')?.source, 'manual-anchor');
    assert.equal(byAnchorLabel.get('Weight')?.slot.kind, 'badge');
    assert.ok(callouts.every((callout) => callout.factPath), `${sourceCode} callouts must keep source-backed fact paths`);

    const missing = buildCallouts({ componentType: 'GASKET', dimensions: { odMm: { value: 150 } } }, symbolByCode(sourceCode), { anchor });
    assert.deepEqual(missing.map((callout) => callout.anchorLabel || callout.label), ['OD']);
    assert.ok(missing.every((callout) => !/(?:—|undefined|null)/i.test(`${callout.label} ${callout.value}`)));
  }
});

test('flange and line-blank anchors generate callouts only when matching DB facts exist', async () => {
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');

  for (const sourceCode of FLANGE_CODES.filter((item) => sourceCodes.has(item))) {
    const anchor = await normalizedAnchor(sourceCode);
    const row = {
      componentType: 'FLANGE',
      dimensions: {
        flangeOuterDiameterMm: { value: 220 },
        boreMm: { value: 80 },
        flangeThicknessMm: { value: 24 },
        raisedFaceMm: { value: 2 },
        pcdMm: { value: 180 },
        boltCount: { value: 8 },
        boltSize: { value: 'M16' },
      },
      weights: { kg: { value: 6.5 } },
    };
    const callouts = buildCallouts(row, symbolByCode(sourceCode), { anchor });
    const byAnchorLabel = new Map(callouts.map((callout) => [callout.anchorLabel, callout]));
    assert.equal(byAnchorLabel.get('OD')?.source, 'manual-anchor');
    if (sourceCode !== 'Flan3') assert.equal(byAnchorLabel.get('Bore')?.source, 'manual-anchor');
    assert.equal(byAnchorLabel.get('Thickness')?.slot.kind, 'leader');
    assert.equal(byAnchorLabel.get('RF')?.source, 'manual-anchor');
    assert.equal(byAnchorLabel.get('PCD')?.slot.kind, 'diameter');
    assert.equal(byAnchorLabel.get('Bolts')?.slot.kind, 'badge');
    assert.equal(byAnchorLabel.get('Weight')?.slot.kind, 'badge');
    assert.equal(byAnchorLabel.get('Weight')?.arrow, false);
  }

  for (const sourceCode of BLANK_CODES.filter((item) => sourceCodes.has(item))) {
    const anchor = await normalizedAnchor(sourceCode);
    const callouts = buildCallouts({
      componentType: 'LINE_BLANK',
      dimensions: {
        odMm: { value: 220 },
        thicknessMm: { value: 12 },
        paddleLengthMm: { value: 360 },
      },
      weights: { kg: { value: 7.5 } },
    }, symbolByCode(sourceCode), { anchor });
    const byAnchorLabel = new Map(callouts.map((callout) => [callout.anchorLabel, callout]));
    assert.equal(byAnchorLabel.get('OD')?.source, 'manual-anchor');
    assert.equal(byAnchorLabel.get('Thickness')?.slot.kind, 'leader');
    assert.equal(byAnchorLabel.get('Paddle Length')?.slot.kind, 'badge');
    assert.equal(byAnchorLabel.get('Weight')?.slot.kind, 'badge');
  }
});

test('template fallback still works for unanchored valve or fitting sourceCodes', async () => {
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const symbol = symbolByCode('Vlfl1') || symbolByCode('Ftbw1');
  assert.ok(symbol, 'expected an unanchored valve/fitting in manifest');
  assert.ok(!existsSync(anchorPath(symbol.sourceCode)), `${symbol.sourceCode} should remain unanchored for this test`);
  const callouts = buildCallouts({
    componentType: symbol.componentType,
    dimensions: {
      faceToFaceRfMm: { value: 178 },
      heightMm: { value: 410 },
      handwheelDiaMm: { value: 180 },
      centerToEndMm: { value: 90 },
    },
    weights: { kg: { value: 8.2 } },
  }, symbol, { anchor: null });
  assert.ok(callouts.length > 0);
  assert.ok(callouts.every((callout) => callout.source !== 'manual-anchor'));
  assert.ok(callouts.every((callout) => callout.factPath));
});

test('full, compact, and off modes remain safe for anchor-based callouts', async () => {
  const { buildCallouts, calloutsForMode, renderDimensionCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const modeStore = await import('../pipetools/js/svg/dimensionCalloutModeStore.js');
  const restoreStorage = setGlobalStorage(memoryStorage());
  try {
    const anchor = await normalizedAnchor('Gflt1');
    const row = {
      componentType: 'GASKET',
      dimensions: { odMm: { value: 150 }, idMm: { value: 100 }, thicknessMm: { value: 4 } },
      weights: { kg: { value: 1.5 } },
    };
    const callouts = buildCallouts(row, symbolByCode('Gflt1'), { anchor });
    assert.equal(calloutsForMode(callouts, 'full').length, callouts.length);
    assert.ok(calloutsForMode(callouts, 'compact').length <= 4);

    modeStore.setDimensionCalloutMode('off');
    const fakeViewport = { dataset: {}, querySelectorAll: () => [], append: () => { throw new Error('off mode must not append callouts'); } };
    const rendered = renderDimensionCallouts(row, symbolByCode('Gflt1'), fakeViewport, { anchor });
    assert.deepEqual(rendered, []);
    assert.equal(fakeViewport.dataset.dimensionCalloutMode, 'off');
  } finally {
    restoreStorage();
  }
});

test('existing Pipe1 anchor behavior remains unchanged', async () => {
  const { buildCallouts } = await import('../pipetools/js/svg/dimensionCallouts.js');
  const anchor = await normalizedAnchor('Pipe1');
  const callouts = buildCallouts({
    componentType: 'PIPE',
    dimensions: {
      odMm: { value: 290 },
      idMm: { value: 212 },
      wallThicknessMm: { value: 39 },
    },
    weights: { weightKgPerM: { value: 84 } },
  }, symbolByCode('Pipe1'), { anchor });
  const byLabel = new Map(callouts.map((callout) => [callout.label, callout]));
  assert.equal(byLabel.get('Wall / Thk')?.source, 'manual-anchor');
  assert.equal(byLabel.get('Wall / Thk')?.slot.kind, 'leader');
  assert.equal(byLabel.get('Weight / m')?.source, 'manual-anchor');
  assert.equal(byLabel.get('Weight / m')?.slot.kind, 'badge');
  assert.equal(byLabel.get('Weight / m')?.arrow, false);
});

test('anchor validator and coverage audit pass in check mode', async () => {
  await execFileAsync(process.execPath, ['pipetools/symbols/dxf/validate-symbol-anchors.mjs'], { cwd: repoRoot });
  await execFileAsync(process.execPath, ['pipetools/symbols/dxf/audit-symbol-anchor-coverage.mjs', '--check'], { cwd: repoRoot });
});
