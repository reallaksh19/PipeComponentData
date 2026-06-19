import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';
import { lookupFittingRecord, validateFittingRows } from '../src/db/fittingCatalog.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const fittings = readJson('data/normalized/fittings.json');
const fittingIndex = readJson('data/indexes/fitting.index.json');
const searchIndex = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const assets = { searchIndex, aliases, catalogs: { 'data/normalized/fittings.json': fittings } };

test('DB Phase 87: fitting 100% promotion rows are source-backed and complete', () => {
  assert.equal(fittings.schema, 'pipedata-normalized-fittings/v1');
  assert.equal(fittings.metadata.expansionPack, 'DB_PHASE_87_FITTING_100_PROMOTION');
  assert.equal(fittings.rows.length, 3898);

  const subtypes = new Set(fittings.rows.map(row => row.subtype));
  assert.ok(subtypes.has('ELBOW_90'));
  assert.ok(subtypes.has('ELBOW_45'));
  assert.ok(subtypes.has('TEE_STRAIGHT'));
  assert.ok(subtypes.has('TEE_REDUCING'));
  assert.ok(subtypes.has('CAP'));
});

test('DB Phase 87: fitting validation and duplicate check', () => {
  const errors = validateFittingRows(fittings.rows);
  assert.deepEqual(errors, []);
});

test('DB Phase 87: ReducingTee matrix-parsed row structure and values', () => {
  const tee64 = fittings.rows.find((row) => row.id === 'FITTING|TEE_REDUCING|NPS6x4|SCH40|METRIC');
  assert.ok(tee64, 'Reducing Tee 6x4 SCH40 should exist');
  assert.equal(tee64.dimensions.centerToEndMm.value, 143);
  assert.equal(tee64.dimensions.branchCenterToEndMm.value, 130);
  assert.equal(tee64.weights.weightKg.value, 16);
  assert.equal(tee64.sourceRowNumber, 16);
});

test('DB Phase 87: fitting exact lookup works and negative fixtures match', () => {
  // Positive lookup: Straight Tee NPS 4 SCH 40
  const hit1 = lookupFittingRecord(fittings.rows, { subtype: 'TEE_STRAIGHT', nps: '4', schedule: '40', unitSystem: 'METRIC' });
  assert.equal(hit1.ok, true);
  assert.equal(hit1.row.id, 'FITTING|TEE_STRAIGHT|NPS4|SCH40|METRIC');

  // Positive lookup: Reducing Tee NPS 6x4 SCH 40
  const hit2 = lookupFittingRecord(fittings.rows, { subtype: 'TEE_REDUCING', nps: '6x4', schedule: '40', unitSystem: 'METRIC' });
  assert.equal(hit2.ok, true);
  assert.equal(hit2.row.id, 'FITTING|TEE_REDUCING|NPS6x4|SCH40|METRIC');

  // Positive exact lookup via lookupComponentExact
  const hit3 = lookupComponentExact('Reducing Tee 6 4 SCH40', assets, {
    filters: { componentType: 'FITTING', subtype: 'TEE_REDUCING', nps: '6x4', schedule: '40' }
  });
  assert.equal(hit3.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit3.row.id, 'FITTING|TEE_REDUCING|NPS6x4|SCH40|METRIC');

  // Negative fixture 1: lookup miss for wrong schedule
  const miss1 = lookupFittingRecord(fittings.rows, { subtype: 'TEE_REDUCING', nps: '6x4', schedule: '1600', unitSystem: 'METRIC' });
  assert.equal(miss1.ok, false);

  // Negative fixture 2: exact lookup miss for wrong schedule
  const miss2 = lookupComponentExact('Reducing Tee 6 4 SCH1600', assets, {
    filters: { componentType: 'FITTING', subtype: 'TEE_REDUCING', nps: '6x4', schedule: '1600' }
  });
  assert.equal(miss2.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
