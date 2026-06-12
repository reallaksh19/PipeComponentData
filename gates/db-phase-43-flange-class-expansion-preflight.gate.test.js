import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const preflight = readJson('data/audit/flange-class-expansion-preflight.json');
const ledger = readJson('data/audit/source-expansion-ledger.json');
const flanges = readJson('data/normalized/flanges.json');
const cl600 = readJson('data/normalized/flanges-cl600-wave2.json');
const cl600Wave3 = readJson('data/normalized/flanges-cl600-wave3.json');

const allRows = [...flanges.rows, ...cl600.rows, ...cl600Wave3.rows];
const classRatings = [...new Set(allRows.map((row) => String(row.classRating)))].sort();

test('DB Phase 43: flange class expansion remains preflight-governed', () => {
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

test('DB Phase 43: flange boundary is still partial after bounded CL600 waves', () => {
  assert.ok(['DB_PHASE_56', 'DB_PHASE_59'].includes(ledger.families.FLANGE.latestPromotionPhase));
  assert.equal(flanges.rows.length, preflight.currentBoundary.normalizedRowsRemain);
  assert.equal(cl600.rows.length, 9);
  assert.equal(cl600Wave3.rows.length, 6);
  assert.deepEqual(classRatings, ['150', '300', '600']);
  for (const rating of ['400', '900', '1500', '2500']) {
    assert.equal(classRatings.includes(rating), false, `Class ${rating} should not be promoted yet`);
  }
});

test('DB Phase 43: flange safety rules remain active', () => {
  assert.equal(preflight.safetyRules.noFabricatedEngineeringValues, true);
  assert.equal(preflight.safetyRules.noNearestClassFallback, true);
  assert.equal(preflight.safetyRules.blindFlangeUnavailableFieldsRemainUnavailable, true);
  for (const row of allRows) assert.ok(!Object.values(row.valueBasis ?? {}).includes('FABRICATED'));
});
