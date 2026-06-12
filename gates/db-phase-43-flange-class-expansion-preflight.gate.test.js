import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const preflight = readJson('data/audit/flange-class-expansion-preflight.json');
const ledger = readJson('data/audit/source-expansion-ledger.json');
const flanges = readJson('data/normalized/flanges.json');

const classRatings = [...new Set(flanges.rows.map((row) => String(row.classRating)))].sort();

test('DB Phase 43: flange class expansion is preflight only', () => {
  assert.equal(preflight.schema, 'pipedata-flange-class-expansion-preflight/v1');
  assert.equal(preflight.phase, 'DB_PHASE_43');
  assert.equal(preflight.status, 'PREFLIGHT_READY_NOT_PROMOTED');
  assert.equal(preflight.scope.promotionApplied, false);
  assert.equal(preflight.scope.normalizedDataChanged, false);
});

test('DB Phase 43: candidate flange class source files are committed', () => {
  const files = [...preflight.sourceEvidence.alreadyPromotedSourceFiles, ...preflight.sourceEvidence.candidateSourceFiles];
  for (const path of files) {
    assert.equal(fs.existsSync(path), true, `${path} missing`);
    assert.match(fs.readFileSync(path, 'utf8'), /wn kg|so kg|bld kg/i);
  }
  assert.deepEqual(preflight.sourceEvidence.candidateClassRatings, ['400', '600', '900', '1500', '2500']);
});

test('DB Phase 43: flange catalog boundary is unchanged after wave 1', () => {
  assert.equal(ledger.families.FLANGE.latestPromotionPhase, 'DB_PHASE_48');
  assert.equal(flanges.rows.length, preflight.currentBoundary.normalizedRowsRemain);
  assert.deepEqual(classRatings, preflight.currentBoundary.normalizedClassRatingsRemain);
  for (const rating of preflight.sourceEvidence.candidateClassRatings) {
    assert.equal(classRatings.includes(rating), false, `Class ${rating} should not be promoted yet`);
  }
});

test('DB Phase 43: flange safety rules remain active', () => {
  assert.equal(preflight.safetyRules.noFabricatedEngineeringValues, true);
  assert.equal(preflight.safetyRules.noNearestClassFallback, true);
  assert.equal(preflight.safetyRules.blindFlangeUnavailableFieldsRemainUnavailable, true);
  for (const row of flanges.rows) assert.ok(!Object.values(row.valueBasis ?? {}).includes('FABRICATED'));
});
