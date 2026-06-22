import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

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
