import assert from 'node:assert/strict';
import test from 'node:test';
import { access } from 'node:fs/promises';
import { readJson } from './utils/readJson.js';
import { readApiSurface } from './utils/apiSurface.js';

const docs = [
  'docs/adaptergraph-uxml-contract.md',
  'docs/state-store-contract.md',
  'docs/distribution-contract.md',
];

const contracts = [
  'contracts/adaptergraph-keys.json',
  'contracts/api-surface.json',
  'contracts/capabilities.json',
  'contracts/phase-manifest.json',
];

test('phase 0 contract files exist', async () => {
  for (const file of [...docs, ...contracts]) await access(file);
});

test('public API surface matches lockfile', async () => {
  const expected = await readJson('contracts/api-surface.json');
  const actual = await readApiSurface('src/index.js');
  assert.deepEqual(actual, expected['src/index.js'].sort());
});

test('module line count stays below 200 lines', async () => {
  const files = ['src/index.js', 'src/graph/createAdapterGraph.js'];
  for (const file of files) {
    const lineCount = (await import('node:fs/promises'))
      .readFile(file, 'utf8')
      .then((text) => text.split('\n').length);
    assert.ok((await lineCount) <= 200, `${file} exceeds 200 lines`);
  }
});
