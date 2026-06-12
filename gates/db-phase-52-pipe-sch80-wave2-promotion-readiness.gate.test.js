import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('data/audit/pipe-sch80-wave2-promotion-readiness.json', 'utf8'));
const pipes = JSON.parse(fs.readFileSync('data/normalized/pipes.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));

const csvRows = fs.readFileSync('docs/Pipedata/Database/Pipe/PIPE80.csv', 'utf8').trimEnd().split('\n');

test('DB Phase 52: SCH80 wave 2 is promotion-ready but not applied', () => {
  assert.equal(manifest.schema, 'pipedata-pipe-sch80-wave2-promotion-readiness/v1');
  assert.equal(manifest.phase, 'DB_PHASE_52');
  assert.equal(manifest.status, 'READY_FOR_BOUNDED_PROMOTION_NOT_APPLIED');
  assert.equal(manifest.scope.promotionApplied, false);
  assert.equal(manifest.scope.normalizedDataChanged, false);
  assert.equal(manifest.safetyRules.noBulkPromotion, true);
});

test('DB Phase 52: source CSV rows exactly match candidate SCH80 values', () => {
  assert.match(csvRows[0], /3-OD/);
  assert.match(csvRows[0], /13-NPS/);
  for (const candidate of manifest.candidateRows) {
    const line = csvRows[candidate.sourceRowNumber - 1];
    const cols = line.split(',');
    assert.equal(cols[0], candidate.nps);
    assert.equal(Number(cols[1]), candidate.dn);
    assert.equal(Number(cols[2]), candidate.odMm);
    assert.equal(Number(cols[3]), candidate.wallMm);
    assert.equal(Number(cols[5]), candidate.idMm);
    assert.equal(Number(cols[6]), candidate.weightKgPerM);
  }
});

test('DB Phase 52: current normalized pipe boundary remains unchanged until the promotion PR', () => {
  assert.equal(pipes.rows.length, 10);
  assert.equal(index.entries.filter((entry) => entry.family === 'PIPE').length, 9);
  for (const nps of ['8', '10', '12']) {
    const id = `PIPE|NPS${nps}|SCH80`;
    assert.equal(pipes.rows.some((row) => row.id === id), nps === '8' ? false : false);
    assert.equal(index.entries.some((entry) => entry.id === id), false);
  }
});

test('DB Phase 52: gate file remains small', () => {
  assert.ok(fs.readFileSync('gates/db-phase-52-pipe-sch80-wave2-promotion-readiness.gate.test.js', 'utf8').split('\n').length <= 120);
});
