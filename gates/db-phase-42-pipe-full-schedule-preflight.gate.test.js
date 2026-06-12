import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const preflight = readJson('data/audit/pipe-full-schedule-preflight.json');
const ledger = readJson('data/audit/source-expansion-ledger.json');
const pipes = readJson('data/normalized/pipes.json');

const schedules = new Set(pipes.rows.map((row) => String(row.schedule)));

test('DB Phase 42: pipe full-schedule expansion is preflight only', () => {
  assert.equal(preflight.schema, 'pipedata-pipe-full-schedule-preflight/v1');
  assert.equal(preflight.phase, 'DB_PHASE_42');
  assert.equal(preflight.status, 'PREFLIGHT_READY_NOT_PROMOTED');
  assert.equal(preflight.scope.promotionApplied, false);
  assert.equal(preflight.scope.normalizedDataChanged, false);
});

test('DB Phase 42: required pipe source evidence is committed', () => {
  for (const path of preflight.sourceEvidence.requiredSourceFiles) {
    assert.equal(fs.existsSync(path), true, `${path} missing`);
    assert.match(fs.readFileSync(path, 'utf8'), /NPS/);
  }
  assert.equal(ledger.families.PIPE.latestPromotionPhase, 'DB_PHASE_47');
  assert.equal(ledger.families.PIPE.productionComplete, false);
});

test('DB Phase 42: pipe catalog boundary is unchanged after wave 1', () => {
  assert.equal(pipes.rows.length, preflight.currentBoundary.normalizedRowsRemain);
  assert.deepEqual([...schedules].sort(), preflight.sourceEvidence.currentPromotedSchedules);
  assert.equal(pipes.rows.some((row) => String(row.schedule) === '160'), false);
});

test('DB Phase 42: pipe safety rules remain active', () => {
  assert.equal(preflight.safetyRules.noFabricatedEngineeringValues, true);
  assert.equal(preflight.safetyRules.noNearestScheduleFallback, true);
  assert.equal(preflight.safetyRules.missingValuesRemainNullOrUnavailable, true);
  for (const row of pipes.rows) assert.ok(!Object.values(row.valueBasis ?? {}).includes('FABRICATED'));
});
