import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupFittingRecord, validateFittingRows } from '../src/db/fittingCatalog.js';

const CATALOG = 'data/normalized/fittings.json';
const INDEX = 'data/indexes/fitting.index.json';
const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

test('DB Phase 8: committed fitting wave catalog is source-backed and indexed', () => {
  const catalog = readJson(CATALOG);
  const index = readJson(INDEX);
  assert.equal(catalog.schema, 'pipedata-normalized-fittings/v1');
  assert.equal(catalog.metadata.phase, 'DB_PHASE_50');
  assert.equal(catalog.metadata.generationMode, 'SOURCE_BACKED_WAVE_1_EXPANSION');
  assert.equal(catalog.metadata.sampledRowCount, 15);
  assert.equal(catalog.rows.length, 15);
  assert.equal(index.metadata.rowCount, 15);
  assert.deepEqual(validateFittingRows(catalog.rows), []);
  for (const row of catalog.rows) assert.equal(index.byKey[row.id], row.id);
});

test('DB Phase 8: original elbow, tee and cap source values are preserved', () => {
  const catalog = readJson(CATALOG);
  const elbow4 = catalog.rows.find((row) => row.id === 'FITTING|ELBOW_90|NPS4|SCH40|METRIC');
  assert.equal(elbow4.source, 'docs/Pipedata/Database/Ftbw/90Elbow40.csv');
  assert.equal(elbow4.sourceRowNumber, 14);
  assert.equal(elbow4.dimensions.centerToEndMm.value, 152);
  assert.equal(elbow4.weights.weightKg.value, 3.9);
  const tee6 = catalog.rows.find((row) => row.id === 'FITTING|TEE_STRAIGHT|NPS6|SCH40|METRIC');
  assert.equal(tee6.dimensions.centerToEndMm.value, 143);
  assert.equal(tee6.dimensions.branchCenterToEndMm.value, 143);
  assert.equal(tee6.weights.weightKg.value, 16.48);
  const cap6 = catalog.rows.find((row) => row.id === 'FITTING|CAP|NPS6|SCH40|METRIC');
  assert.equal(cap6.dimensions.overCapMm.value, 89);
  assert.equal(cap6.dimensions.overCapE1Mm.value, 102);
  assert.equal(cap6.weights.weightKg.value, 3.6);
});

test('DB Phase 8: wave 1 elbow source values are preserved and no reducer is promoted', () => {
  const catalog = readJson(CATALOG);
  const elbow45 = catalog.rows.find((row) => row.id === 'FITTING|ELBOW_45|NPS4|SCH40|METRIC');
  assert.equal(elbow45.source, 'docs/Pipedata/Database/Ftbw/45Elbow40.csv');
  assert.equal(elbow45.dimensions.radiusMm.value, 151.60625);
  assert.equal(elbow45.dimensions.centerToEndMm.value, 64);
  assert.equal(elbow45.weights.weightKg.value, 1.95);
  const elbow80 = catalog.rows.find((row) => row.id === 'FITTING|ELBOW_90|NPS4|SCH80|METRIC');
  assert.equal(elbow80.source, 'docs/Pipedata/Database/Ftbw/90Elbow80.csv');
  assert.equal(elbow80.weights.weightKg.value, 5.4);
  assert.equal(catalog.rows.some((row) => /REDUCER/.test(row.subtype)), false);
});

test('DB Phase 8: fitting exact catalog lookup stays key-based', () => {
  const catalog = readJson(CATALOG);
  const hit = lookupFittingRecord(catalog.rows, { subtype: 'ELBOW_90', nps: '4', schedule: '80', unitSystem: 'METRIC' });
  assert.equal(hit.ok, true);
  assert.equal(hit.row.weights.weightKg.value, 5.4);
  const miss = lookupFittingRecord(catalog.rows, { subtype: 'CAP', nps: '6', schedule: '80', unitSystem: 'METRIC' });
  assert.equal(miss.ok, false);
});

test('DB Phase 8: fitting catalog modules and gate stay under 300 lines', () => {
  for (const path of ['src/db/fittingCatalog.js', 'gates/db-phase-08-fittings.gate.test.js']) {
    const lines = fs.readFileSync(path, 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${path} has ${lines} lines`);
  }
});
