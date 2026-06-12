import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const preflight = readJson('data/audit/pipe-full-schedule-preflight.json');
const ledger = readJson('data/audit/source-expansion-ledger.json');
const pipes = readJson('data/normalized/pipes.json');
const sch80Wave2 = readJson('data/normalized/pipes-sch80-wave2.json');
const sch80Wave3 = readJson('data/normalized/pipes-sch80-wave3.json');

const allRows = [...pipes.rows, ...sch80Wave2.rows, ...sch80Wave3.rows];
const schedules = new Set(allRows.map((row) => String(row.schedule)));

test('DB Phase 42: pipe full-schedule expansion remains preflight-governed', () => {
  assert.equal(preflight.schema, 'pipedata-pipe-full-schedule-preflight/v1');
  assert.equal(preflight.phase, 'DB_PHASE_42');
  assert.equal(preflight.status, 'PREFLIGHT_READY_NOT_PROMOTED');
  assert.equal(preflight.scope.promotionApplied, false);
  assert.equal(preflight.scope.normalizedDataChanged, false);
});

test('DB Phase 42: required pipe source evidence is committed and later bounded promotion is tracked', () => {
  for (const path of preflight.sourceEvidence.requiredSourceFiles) {
    assert.equal(fs.existsSync(path), true, `${path} missing`);
    assert.match(fs.readFileSync(path, 'utf8'), /NPS/);
  }
  assert.ok(['DB_PHASE_55', 'DB_PHASE_58'].includes(ledger.families.PIPE.latestPromotionPhase));
  assert.equal(ledger.families.PIPE.productionComplete, false);
});

test('DB Phase 42: full schedule boundary is still partial after bounded SCH80 waves', () => {
  assert.equal(pipes.rows.length, preflight.currentBoundary.normalizedRowsRemain);
  assert.equal(sch80Wave2.rows.length, 3);
  assert.equal(sch80Wave3.rows.length, 3);
  assert.deepEqual([...schedules].sort(), ['40', '80']);
  assert.equal(allRows.some((row) => String(row.schedule) === '160'), false);
});

test('DB Phase 42: pipe safety rules remain active', () => {
  assert.equal(preflight.safetyRules.noFabricatedEngineeringValues, true);
  assert.equal(preflight.safetyRules.noNearestScheduleFallback, true);
  assert.equal(preflight.safetyRules.missingValuesRemainNullOrUnavailable, true);
  for (const row of allRows) assert.ok(!Object.values(row.valueBasis ?? {}).includes('FABRICATED'));
});
