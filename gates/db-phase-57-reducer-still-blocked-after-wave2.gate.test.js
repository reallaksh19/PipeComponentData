import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const index = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('data/audit/reducer-source-column-map.json', 'utf8'));
const ledger = JSON.parse(fs.readFileSync('data/audit/source-expansion-ledger.json', 'utf8'));

test('DB Phase 57: reducer remains blocked after pipe/flange wave 2 promotion', () => {
  assert.equal(manifest.schema, 'pipedata-reducer-source-column-map/v1');
  assert.equal(manifest.phase, 'DB_PHASE_54');
  assert.equal(manifest.scope.promotionApplied, false);
  assert.equal(ledger.families.REDUCER.status, 'BLOCKED_SOURCE_MISSING');
});

test('DB Phase 57: no reducer rows are indexed through generic fitting fallback', () => {
  assert.equal(index.entries.some((entry) => entry.family === 'REDUCER'), false);
  assert.equal(index.entries.some((entry) => /REDUCER|CONCENTRIC|ECCENTRIC|SWAGE/.test(entry.id)), false);
});

test('DB Phase 57: reducer source map still requires two-size identity before promotion', () => {
  assert.deepEqual(manifest.canonicalIdentity, ['largeNps', 'smallNps', 'largeSchedule', 'smallSchedule', 'reducerType']);
  assert.equal(manifest.safetyRules.noSingleNpsReducerRows, true);
  assert.equal(manifest.safetyRules.noNearestLargeOrSmallNpsFallback, true);
});
