import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('data/audit/pipe-sch80-wave2-promotion-readiness.json', 'utf8'));
const addendum = JSON.parse(fs.readFileSync('data/normalized/pipes-sch80-wave2.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));

const csvRows = fs.readFileSync('docs/Pipedata/Database/Pipe/PIPE80.csv', 'utf8').trimEnd().split('\n');

test('DB Phase 52: SCH80 wave 2 readiness source remains locked', () => {
  assert.equal(manifest.schema, 'pipedata-pipe-sch80-wave2-promotion-readiness/v1');
  assert.equal(manifest.phase, 'DB_PHASE_52');
  assert.equal(manifest.status, 'READY_FOR_BOUNDED_PROMOTION_NOT_APPLIED');
  assert.equal(manifest.scope.promotionApplied, false);
  assert.equal(manifest.safetyRules.noBulkPromotion, true);
});

test('DB Phase 52: source CSV rows exactly match candidate SCH80 values', () => {
  assert.match(csvRows[0], /3-OD/);
  assert.match(csvRows[0], /13-NPS/);
  for (const candidate of manifest.candidateRows) {
    const line = csvRows.find((row) => row.startsWith(`${candidate.nps},${candidate.dn},`));
    assert.ok(line, `Missing PIPE80 source row for NPS ${candidate.nps}`);
    const cols = line.split(',');
    assert.equal(Number(cols[2]), candidate.odMm);
    assert.equal(Number(cols[3]), candidate.wallMm);
    assert.equal(Number(cols[5]), candidate.idMm);
    assert.equal(Number(cols[6]), candidate.weightKgPerM);
  }
});

test('DB Phase 52: bounded SCH80 rows are now promoted through the wave 2 addendum', () => {
  assert.equal(addendum.summary.expansionPack, 'DB_PHASE_55_PIPE_SCH80_WAVE2_PROMOTION');
  assert.equal(addendum.rows.length, 3);
  assert.equal(index.entries.filter((entry) => entry.family === 'PIPE').length, 12);
  for (const nps of ['8', '10', '12']) {
    const id = `PIPE|NPS${nps}|SCH80`;
    assert.equal(addendum.rows.some((row) => row.id === id), true);
    assert.equal(index.entries.some((entry) => entry.id === id), true);
  }
});

test('DB Phase 52: gate file remains small', () => {
  assert.ok(fs.readFileSync('gates/db-phase-52-pipe-sch80-wave2-promotion-readiness.gate.test.js', 'utf8').split('\n').length <= 140);
});
