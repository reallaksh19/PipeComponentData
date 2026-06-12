import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const fixtures = JSON.parse(fs.readFileSync('data/exports/exact-lookup-fixtures.json', 'utf8'));
const searchIndex = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));
const aliases = JSON.parse(fs.readFileSync('data/search/component-aliases.json', 'utf8'));

const catalogs = {
  'data/normalized/pipes.json': JSON.parse(fs.readFileSync('data/normalized/pipes.json', 'utf8')),
  'data/normalized/flanges.json': JSON.parse(fs.readFileSync('data/normalized/flanges.json', 'utf8')),
  'data/normalized/valves.json': JSON.parse(fs.readFileSync('data/normalized/valves.json', 'utf8')),
  'data/normalized/fittings.json': JSON.parse(fs.readFileSync('data/normalized/fittings.json', 'utf8')),
  'data/normalized/gaskets.json': JSON.parse(fs.readFileSync('data/normalized/gaskets.json', 'utf8')),
  'data/normalized/supports.json': JSON.parse(fs.readFileSync('data/normalized/supports.json', 'utf8')),
};

const assets = { searchIndex, aliases, catalogs };

test('DB Phase 33: fixture manifest records exact lookup policy', () => {
  assert.equal(fixtures.schema, 'pipedata-exact-lookup-fixtures/v1');
  assert.equal(fixtures.phase, 'DB_PHASE_33');
  assert.equal(fixtures.policy.exactMatchOnly, true);
  assert.equal(fixtures.policy.noFallbackExpected, true);
  assert.equal(fixtures.cases.length >= 6, true);
  assert.ok(fixtures.cases.every((item) => item.filters && typeof item.filters === 'object'));
});

test('DB Phase 33: exact lookup fixture matrix matches public API behavior', () => {
  for (const item of fixtures.cases) {
    const result = lookupComponentExact(item.query, assets, { filters: item.filters });
    assert.equal(result.status, LOOKUP_STATUS[item.expectedStatus], item.caseId);

    if (item.expectedStatus === 'FOUND') {
      assert.equal(result.ok, true, item.caseId);
      assert.equal(result.id, item.expectedId, item.caseId);
      assert.equal(result.family, item.expectedFamily, item.caseId);
      assert.equal(result.dataStatus, item.expectedDataStatus, item.caseId);
    } else {
      assert.equal(result.ok, false, item.caseId);
      assert.equal(result.id, item.expectedId, item.caseId);
    }
  }
});

test('DB Phase 33: wrong engineering rating does not fall back to available valve', () => {
  const wrong = fixtures.cases.find((item) => item.caseId === 'wrong-rating-no-fallback');
  const result = lookupComponentExact(wrong.query, assets, { filters: wrong.filters });
  assert.equal(result.ok, false);
  assert.equal(result.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  assert.equal(result.row, null);
});
