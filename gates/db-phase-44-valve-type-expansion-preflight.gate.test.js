import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const preflight = readJson('data/audit/valve-type-expansion-preflight.json');
const ledger = readJson('data/audit/source-expansion-ledger.json');
const valves = readJson('data/normalized/valves.json');

const unique = (field) => [...new Set(valves.rows.map((row) => String(row[field])))].sort();

test('DB Phase 44: valve type expansion is preflight only', () => {
  assert.equal(preflight.schema, 'pipedata-valve-type-expansion-preflight/v1');
  assert.equal(preflight.phase, 'DB_PHASE_44');
  assert.equal(preflight.status, 'PREFLIGHT_READY_NOT_PROMOTED');
  assert.equal(preflight.scope.promotionApplied, false);
  assert.equal(preflight.scope.normalizedDataChanged, false);
});

test('DB Phase 44: valve source evidence and type set files are committed', () => {
  const files = [...preflight.sourceEvidence.alreadyPromotedSourceFiles, ...preflight.sourceEvidence.candidateSetFilesForReview];
  for (const path of files) {
    assert.equal(fs.existsSync(path), true, `${path} missing`);
    assert.ok(fs.readFileSync(path, 'utf8').trim().length > 0, `${path} empty`);
  }
  assert.equal(preflight.sourceEvidence.requiresValveTypeMappingReview, true);
});

test('DB Phase 44: valve catalog boundary is unchanged after wave 1', () => {
  assert.equal(ledger.families.VALVE.latestPromotionPhase, 'DB_PHASE_49');
  assert.equal(valves.rows.length, preflight.currentBoundary.normalizedRowsRemain);
  assert.deepEqual(unique('valveType'), preflight.currentBoundary.normalizedValveTypesRemain);
  assert.deepEqual(unique('endType'), preflight.currentBoundary.normalizedEndTypesRemain);
  assert.deepEqual(unique('facing'), preflight.currentBoundary.normalizedFacingsRemain);
  assert.deepEqual(unique('classRating'), preflight.currentBoundary.normalizedClassRatingsRemain);
});

test('DB Phase 44: valve safety rules remain active', () => {
  assert.equal(preflight.safetyRules.noFabricatedEngineeringValues, true);
  assert.equal(preflight.safetyRules.noNearestValveTypeFallback, true);
  assert.equal(preflight.safetyRules.unavailableFaceToFaceValuesRemainUnavailable, true);
  const partial = valves.rows.find((row) => row.dataStatus === 'PARTIAL');
  assert.ok(partial);
  assert.ok(Object.values(partial.dimensions).some((item) => item.basis === 'UNAVAILABLE' && item.value === null));
});
