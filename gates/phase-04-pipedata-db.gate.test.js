import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PHASE4_DATASETS,
  createPipeDataDb,
  listDatasetRows,
  validateDatasetProvenance,
} from '../src/index.js';

const db = createPipeDataDb();

test('all Phase 4 DB rows carry complete provenance', () => {
  const rows = listDatasetRows(PHASE4_DATASETS);
  assert.ok(rows.length >= 5);
  const result = validateDatasetProvenance(PHASE4_DATASETS);
  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
});

test('published pipe spot checks are exact', () => {
  const result = db.lookupPipe({ nps: '4', schedule: '40' });
  assert.equal(result.ok, true);
  assert.equal(result.row.odMm, 114.3);
  assert.equal(result.row.wallMm, 6.02);
  assert.equal(result.row.weightKgPerM, 16.07);
  assert.equal(result.provenance.datasetVersion, 'pipedata-db/2026.06.phase4');
});

test('valve, flange, fitting, and weight lookups return exact seed values', () => {
  const valve = db.lookupValve({ valveType: 'GATE', nps: '8', classRating: '150', facing: 'RF' });
  assert.equal(valve.ok, true);
  assert.equal(valve.row.ffRfMm, 292);
  assert.equal(valve.row.ffRtjMm, 305);
  assert.equal(valve.row.ffBwMm, 419);

  const flange = db.lookupFlange({ subtype: 'WN', nps: '4', classRating: '300', facing: 'RF' });
  assert.equal(flange.ok, true);
  assert.equal(flange.row.flangeOdMm, 255);
  assert.equal(flange.row.flangeThicknessMm, 30.2);
  assert.notEqual(flange.row.weldDiaMm, flange.row.boreMm);

  const fitting = db.lookupFitting({ subtype: 'ELBOW_90_LR', nps: '4', schedule: '40' });
  assert.equal(fitting.ok, true);
  assert.equal(fitting.row.centerlineRadiusMm, 152.4);
  assert.equal(fitting.row.developedLengthMm, 239.39);

  const weight = db.lookupWeight({ componentType: 'VALVE', subtype: 'GATE', nps: '8', classRating: '150' });
  assert.equal(weight.ok, true);
  assert.equal(weight.row.weightKg, 144);
});

test('lookup misses return ok:false and never throw', () => {
  const calls = [
    () => db.lookupPipe({ nps: '99', schedule: 'XX' }),
    () => db.lookupValve({ valveType: 'UNKNOWN', nps: '8', classRating: '150' }),
    () => db.lookupFlange({ subtype: 'WN', nps: '99', classRating: '300' }),
    () => db.lookupFitting({ subtype: 'UNKNOWN', nps: '4', schedule: '40' }),
    () => db.lookupWeight({ componentType: 'VALVE', subtype: 'UNKNOWN', nps: '8', classRating: '150' }),
  ];
  for (const call of calls) {
    const result = call();
    assert.equal(result.ok, false);
    assert.ok(result.code.endsWith('_LOOKUP_MISS'));
    assert.ok(result.query);
  }
});
