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

test('DB Phase 16: exact lookup returns normalized row and provenance for a valve', () => {
  const result = lookupComponentExact('GATE VALVE 8 150 RF', assets, {
    filters: { componentType: 'VALVE', valveType: 'GATE', nps: '8', classRating: '150', facing: 'RF' },
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, LOOKUP_STATUS.FOUND);
  assert.equal(result.id, 'VALVE|GATE|FLANGED|NPS8|CL150|RF');
  assert.equal(result.row.dimensions.faceToFaceRfMm.value, 292);
  assert.equal(result.provenance.source, 'docs/Pipedata/Database/Vlfl/VLV1150.csv');
  assert.match(result.noFallbackPolicy, /No nearest NPS/);
});

test('DB Phase 16: exact lookup includes wave 1 valve row and rejects wrong rating', () => {
  const hit = lookupComponentExact('GATE VALVE 4 1500 RF', assets, {
    filters: { componentType: 'VALVE', valveType: 'GATE', nps: '4', classRating: '1500', facing: 'RF' },
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.weights.rfRtjKg.value, 277);
  const miss = lookupComponentExact('GATE VALVE 4 300 RF', assets, {
    filters: { componentType: 'VALVE', valveType: 'GATE', nps: '4', classRating: '300', facing: 'RF' },
  });
  assert.equal(miss.ok, false);
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  assert.equal(miss.row, null);
  assert.equal(miss.diagnostics[0].code, 'SEARCH_NO_EXACT_MATCH');
});

test('DB Phase 16: gasket inventory lookup does not fabricate dimensions', () => {
  const result = lookupComponentExact('RTJ GASKET', assets, {
    filters: { componentType: 'GASKET', subtype: 'RTJ', facing: 'RTJ' },
  });
  assert.equal(result.ok, true);
  assert.equal(result.id, 'GASKET|RTJ|UNKNOWN|UNKNOWN|RTJ');
  assert.equal(result.dataStatus, 'MISSING_DIMENSION');
  for (const value of Object.values(result.row.dimensions)) {
    assert.equal(value.value, null);
    assert.equal(value.basis, 'UNAVAILABLE');
  }
});

test('DB Phase 16: exact lookup surfaces index/catalog mismatch as API error', () => {
  const result = lookupComponentExact('GATE VALVE 8 150 RF', { searchIndex, aliases, catalogs: {} });
  assert.equal(result.ok, false);
  assert.equal(result.status, LOOKUP_STATUS.CATALOG_ROW_MISSING);
  assert.equal(result.diagnostics[0].code, 'CATALOG_ROW_MISSING');
});

test('DB Phase 16: exact lookup is exported from the public package entrypoint', () => {
  assert.equal(publicLookup, lookupComponentExact);
});

test('DB Phase 16: helper and gate stay under accepted 300-line limit', () => {
  for (const path of ['src/db/lookupComponentExact.js', 'gates/db-phase-16-exact-lookup-api.gate.test.js']) {
    const lines = fs.readFileSync(path, 'utf8').trimEnd().split('\n').length;
    assert.ok(lines <= 300, `${path} has ${lines} lines`);
  }
});
