import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/db/lookupComponentExact.js';
import { lookupComponentExact as publicLookup } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const searchIndex = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts
    .filter((artifact) => artifact.kind === 'NORMALIZED_DATA')
    .map((artifact) => [artifact.path, readJson(artifact.path)]),
);
const assets = { searchIndex, aliases, catalogs };

test('DB Phase 16: exact lookup is exported from the public package entrypoint', () => {
  assert.equal(typeof publicLookup, 'function');
  assert.equal(publicLookup, lookupComponentExact);
  assert.equal(LOOKUP_STATUS.FOUND, 'FOUND');
  assert.equal(LOOKUP_STATUS.NO_EXACT_MATCH, 'NO_EXACT_MATCH');
});

test('DB Phase 16: exact lookup resolves a wave-1 source-backed pipe row', () => {
  const result = lookupComponentExact('', assets, {
    filters: { componentType: 'PIPE', nps: '2', schedule: '80' },
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, LOOKUP_STATUS.FOUND);
  assert.equal(result.id, 'PIPE|NPS2|SCH80');
  assert.equal(result.row.source, 'Database/Pipe/PIPE80.csv');
  assert.equal(result.row.wallMm, 5.54);
  assert.match(result.noFallbackPolicy, /No nearest NPS/);
});

test('DB Phase 16: exact lookup rejects wrong schedule without fallback', () => {
  const result = lookupComponentExact('', assets, {
    filters: { componentType: 'PIPE', nps: '2', schedule: '160' },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  assert.equal(result.row, null);
  assert.equal(result.diagnostics[0].code, 'SEARCH_NO_EXACT_MATCH');
});

test('DB Phase 16: gasket catalog remains missing-dimension and non-fabricated', () => {
  const gasket = catalogs['data/normalized/gaskets.json'].rows.find((row) => row.id === 'GASKET|RTJ|UNKNOWN|UNKNOWN|RTJ');
  assert.equal(gasket.dataStatus, 'MISSING_DIMENSION');
  for (const value of Object.values(gasket.dimensions)) {
    assert.equal(value.value, null);
    assert.equal(value.basis, 'UNAVAILABLE');
  }
});

test('DB Phase 16: exact lookup surfaces index/catalog mismatch as API error when search matches', () => {
  const result = lookupComponentExact('', { searchIndex, aliases, catalogs: {} }, {
    filters: { componentType: 'PIPE', nps: '2', schedule: '80' },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, LOOKUP_STATUS.CATALOG_ROW_MISSING);
  assert.equal(result.diagnostics[0].code, 'CATALOG_ROW_MISSING');
});

test('DB Phase 16: helper and gate stay under accepted 300-line limit', () => {
  for (const path of ['src/db/lookupComponentExact.js', 'gates/db-phase-16-exact-lookup-api.gate.test.js']) {
    const lines = fs.readFileSync(path, 'utf8').trimEnd().split('\n').length;
    assert.ok(lines <= 300, `${path} has ${lines} lines`);
  }
});
