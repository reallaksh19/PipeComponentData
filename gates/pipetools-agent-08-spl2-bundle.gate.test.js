import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const countLines = (path) => read(path).split('\n').length;

const checkedFiles = [
  'pipetools/js/bundle/bundleConfig.js',
  'pipetools/js/bundle/bundleView.js',
  'spl2-bundle/js/spl2/spl2_master.js',
  'gates/pipetools-agent-08-spl2-bundle.gate.test.js',
];

test('SPL2 static bundle files exist', () => {
  assert.ok(existsSync('spl2-bundle/spl2_master.html'));
  assert.ok(existsSync('spl2-bundle/js/spl2/spl2_master.js'));
  assert.ok(existsSync('docs/pipetools/SPL2_LEGACY_IMPORT.md'));
});

test('SPL2 boundary has imported calculation panels', () => {
  const html = read('spl2-bundle/spl2_master.html');
  assert.ok(html.includes('data-pipetools-legacy="spl2"'));
  assert.ok(html.includes('Loop Calculations'));
  assert.ok(html.includes('Pipe Rack Calculation'));
  assert.ok(html.includes('Simplified Method'));
  assert.equal(html.toLowerCase().includes('placeholder reserves'), false);
});

test('SPL2 script provides calculation functions', () => {
  const js = read('spl2-bundle/js/spl2/spl2_master.js');
  assert.ok(js.includes('function calculateLoop'));
  assert.ok(js.includes('function calculateRack'));
  assert.ok(js.includes('function calculateSimplified'));
  assert.ok(js.includes('data-tab'));
});

test('PipeTools bundle config points to the iframe target', () => {
  const config = read('pipetools/js/bundle/bundleConfig.js');
  assert.ok(config.includes('../spl2-bundle/spl2_master.html'));
  assert.ok(config.includes('reallaksh19/Simplified_Analysis'));
});

test('new wave 5 modules stay below 200 lines', () => {
  for (const path of checkedFiles) {
    assert.ok(countLines(path) <= 200, `${path} exceeds 200 lines`);
  }
});
