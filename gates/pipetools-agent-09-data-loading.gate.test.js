import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const lineCount = (path) => read(path).split('\n').length;
const MAX_NATIVE_MODULE_LINES = 300;

const files = [
  'pipetools/js/loaders/cacheStore.js',
  'pipetools/js/loaders/resultState.js',
  'pipetools/js/loaders/rowNormalizer.js',
  'pipetools/js/loaders/catalogLoader.js',
  'pipetools/js/loaders/componentLoader.js',
  'gates/pipetools-agent-09-data-loading.gate.test.js',
];

test('loader source files exist and stay below relaxed 300-line gate', () => {
  for (const path of files) {
    assert.ok(read(path).length > 40, `${path} is missing`);
    assert.ok(lineCount(path) <= MAX_NATIVE_MODULE_LINES, `${path} exceeds ${MAX_NATIVE_MODULE_LINES} lines`);
  }
});

test('catalog maps components to normalized data files', () => {
  const catalog = read('pipetools/js/loaders/catalogLoader.js');
  for (const name of ['valves.json', 'pipes.json', 'flanges.json', 'fittings.json', 'gaskets.json', 'supports.json']) {
    assert.ok(catalog.includes(name), `${name} missing`);
  }
});

test('row normalizer derives stable SVG keys', () => {
  const normalizer = read('pipetools/js/loaders/rowNormalizer.js');
  assert.ok(normalizer.includes('deriveSvgKey'));
  assert.ok(normalizer.includes('componentType'));
  assert.ok(normalizer.includes('dataStatus'));
});

test('app uses component loader instead of direct valve fetch', () => {
  const app = read('pipetools/js/app.js');
  assert.ok(app.includes('loadComponentRows'));
  assert.equal(app.includes('data/normalized/valves.json'), false);
});

test('source valve dataset is still compatible', () => {
  const payload = JSON.parse(read('data/normalized/valves.json'));
  assert.ok(Array.isArray(payload.rows));
  assert.ok(payload.rows.some((row) => row.id === 'VALVE|GATE|FLANGED|NPS8|CL150|RF'));
});
