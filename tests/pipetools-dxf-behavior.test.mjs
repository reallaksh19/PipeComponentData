import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { selectedRowForId } from '../pipetools/js/pipespecState.js';

await import('./pipetools-pipe1-native-cleanup.test.mjs');

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPath = path.join(repoRoot, 'pipetools/symbols/dxf/dxf-symbol-manifest.json');
const dxfRoot = path.join(repoRoot, 'pipetools/symbols/dxf');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const symbols = manifest.symbols || [];

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

test('DXF behavior modules no longer import manual anchor infrastructure', async () => {
  const productFiles = [
    'pipetools/js/svg/dimensionCallouts.js',
    'pipetools/js/svg/dxfSymbolEngine.js',
    'pipetools/js/svg/svgSlotBindingStore.js',
    'pipetools/js/svg/svgSlotPopulator.js',
  ];
  for (const relativePath of productFiles) {
    const text = await readFile(path.join(repoRoot, relativePath), 'utf8');
    assert.doesNotMatch(text, /symbolAnchorStore|manual-anchor|PipeToolsSymbolAnchor/, `${relativePath} must not retain manual anchor overlay references`);
  }
  assert.equal(existsSync(path.join(repoRoot, 'pipetools/symbols/dxf/anchors')), false);
});

test('selected row id resolves to the visible row object for SVG preview', () => {
  const rows = [
    { id: 'PIPE_STD_001', nps: '1/2', componentType: 'PIPE' },
    { id: 'PIPE_STD_002', nps: '3/4', componentType: 'PIPE' },
  ];
  assert.equal(selectedRowForId(rows, 'PIPE_STD_002'), rows[1]);
  assert.equal(selectedRowForId(rows, 'MISSING'), null);
  assert.equal(selectedRowForId(rows, null), null);
});

test('Pipe1 ID dimension geometry is tied to the inner circumference', async () => {
  const alignerText = await readFile(path.join(repoRoot, 'pipetools/js/svg/pipe1IdGeometry.js'), 'utf8');
  const engineText = await readFile(path.join(repoRoot, 'pipetools/js/svg/dxfSymbolEngine.js'), 'utf8');
  const slotText = await readFile(path.join(repoRoot, 'pipetools/symbols/dxf/slots/Pipe1.json'), 'utf8');
  assert.match(alignerText, /const CENTER_X = 7295/);
  assert.match(alignerText, /const INNER_RADIUS = 515/);
  assert.match(alignerText, /const LEFT_ID_X = CENTER_X - INNER_RADIUS/);
  assert.match(alignerText, /const RIGHT_ID_X = CENTER_X \+ INNER_RADIUS/);
  assert.match(alignerText, /setLine\(leftExtension, LEFT_ID_X, CENTER_Y, LEFT_ID_X, ID_DIMENSION_Y\)/);
  assert.match(alignerText, /setLine\(rightExtension, RIGHT_ID_X, CENTER_Y, RIGHT_ID_X, ID_DIMENSION_Y\)/);
  assert.match(engineText, /alignPipe1IdGeometry\(buildPipe1NativeDrawing\(document\)\)/);
  assert.match(slotText, /left inner-circumference arrow corner/);
});

test('source-backed dimension display keeps evidence labels and placeholder policy', async () => {
  const text = await readFile(path.join(repoRoot, 'pipetools/js/dimensionDisplay.js'), 'utf8');
  for (const required of ['F2F RF', 'OD', 'ID', 'Wall / Thk', 'RF dia', 'PCD', 'Bolt count', 'Weight / m']) {
    assert.match(text, new RegExp(required.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')));
  }
  assert.match(text, /function makeFact/);
  assert.match(text, /match\.value == null \|\| match\.value === ''/);
});

test('Pipe1 native cleanup regression suite is committed', async () => {
  assert.ok(existsSync(path.join(repoRoot, 'tests/pipetools-pipe1-native-cleanup.test.mjs')));
});

test('template fallback and slot validators required by CI are committed', async () => {
  const templateText = await readFile(path.join(repoRoot, 'pipetools/js/svg/dimensionCalloutTemplates.js'), 'utf8');
  assert.match(templateText, /const TEMPLATE_FIELDS/);
  assert.match(templateText, /FLANGE/);
  assert.match(templateText, /PIPE/);
  assert.ok(existsSync(path.join(dxfRoot, 'validate-dxf-symbols.mjs')));
  assert.ok(existsSync(path.join(dxfRoot, 'validate-dxf-offsets.mjs')));
  assert.ok(existsSync(path.join(dxfRoot, 'validate-svg-slots.mjs')));
  assert.ok(existsSync(path.join(dxfRoot, 'audit-svg-slot-coverage.mjs')));
  assert.ok(existsSync(path.join(dxfRoot, 'audit-dxf-callout-coverage.mjs')));
});
