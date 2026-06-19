import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const preflight = readJson('data/audit/valve-type-expansion-preflight.json');
const ledger = readJson('data/audit/source-expansion-ledger.json');
const valves = readJson('data/normalized/valves.json');
const valvesExpanded = readJson('data/normalized/valves-expanded.json');
const globeValves = readJson('data/normalized/valves-globe-expanded.json');
const controlValves = readJson('data/normalized/valves-control-expanded.json');

const allValves = [
  ...valves.rows,
  ...valvesExpanded.rows,
  ...globeValves.rows,
  ...controlValves.rows
];

const unique = (field) => [...new Set(allValves.map((row) => String(row[field])))].sort();

test('DB Phase 44: valve type expansion is preflight only', () => {
  assert.equal(preflight.schema, 'pipedata-valve-type-expansion-preflight/v1');
  assert.equal(preflight.phase, 'DB_PHASE_44');
  assert.equal(preflight.status, 'PROMOTION_APPLIED');
  assert.equal(preflight.scope.promotionApplied, true);
  assert.equal(preflight.scope.normalizedDataChanged, true);
});

test('DB Phase 44: valve source evidence and type set files are committed', () => {
  const files = [...preflight.sourceEvidence.alreadyPromotedSourceFiles, ...preflight.sourceEvidence.candidateSetFilesForReview];
  for (const path of files) {
    assert.equal(fs.existsSync(path), true, `${path} missing`);
    assert.ok(fs.readFileSync(path, 'utf8').trim().length > 0, `${path} empty`);
  }
  assert.equal(preflight.sourceEvidence.requiresValveTypeMappingReview, true);
});

test('DB Phase 44: valve catalog boundary is now fully promoted', () => {
  assert.equal(ledger.families.VALVE.latestPromotionPhase, 'DB_PHASE_84');
  assert.equal(valves.rows.length, 599);
  assert.deepEqual(unique('valveType'), ['BALL', 'BUTTERFLY_WAFER', 'CONTROL', 'GATE', 'GLOBE', 'SWING_CHECK', 'WAFER_CHECK']);
  assert.deepEqual(unique('endType'), ['FLANGED', 'WAFER']);
  assert.deepEqual(unique('facing'), ['NA', 'RF']);
  assert.deepEqual(unique('classRating'), ['150', '1500', '2500', '300', '600', '900']);
});

test('DB Phase 44: valve safety rules remain active', () => {
  assert.equal(preflight.safetyRules.noFabricatedEngineeringValues, true);
  assert.equal(preflight.safetyRules.noNearestValveTypeFallback, true);
  assert.equal(preflight.safetyRules.unavailableFaceToFaceValuesRemainUnavailable, true);
  const partial = valves.rows.find((row) => row.dataStatus === 'PARTIAL');
  assert.ok(partial);
  assert.ok(Object.values(partial.dimensions).some((item) => item.basis === 'UNAVAILABLE' && item.value === null));
});
