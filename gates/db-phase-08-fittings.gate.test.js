import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  parseButtweldFittingTable,
  buildFittingIndex,
  lookupFittingRecord,
  validateFittingRows,
} from '../src/db/fittingCatalog.js';

const ELBOW = 'docs/Pipedata/Database/Ftbw/90Elbow40.csv';
const TEE = 'docs/Pipedata/Database/Ftbw/StraightTee40.csv';
const CAP = 'docs/Pipedata/Database/Ftbw/Cap40.csv';
const CATALOG = 'data/normalized/fittings.json';
const INDEX = 'data/indexes/fitting.index.json';
const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

test('DB Phase 8: 90 degree elbow source row pins developed arc length', () => {
  const rows = parseButtweldFittingTable(fs.readFileSync(ELBOW, 'utf8'), { source: ELBOW });
  const elbow4 = rows.find((row) => row.nps === '4');
  assert.equal(rows.length, 29);
  assert.equal(elbow4.sourceRowNumber, 14);
  assert.equal(elbow4.dimensions.odMm.value, 114.3);
  assert.equal(elbow4.dimensions.centerToEndMm.value, 152);
  assert.equal(elbow4.dimensions.developedLengthMm.value, 238.761042);
  assert.equal(elbow4.weights.weightKg.value, 3.9);
});

test('DB Phase 8: straight tee and cap source rows parse without inference', () => {
  const tee6 = parseButtweldFittingTable(fs.readFileSync(TEE, 'utf8'), { source: TEE }).find((row) => row.nps === '6');
  assert.equal(tee6.dimensions.centerToEndMm.value, 143);
  assert.equal(tee6.dimensions.branchCenterToEndMm.value, 143);
  assert.equal(tee6.weights.weightKg.value, 16.48);
  const cap6 = parseButtweldFittingTable(fs.readFileSync(CAP, 'utf8'), { source: CAP }).find((row) => row.nps === '6');
  assert.equal(cap6.dimensions.overCapMm.value, 89);
  assert.equal(cap6.dimensions.overCapE1Mm.value, 102);
  assert.equal(cap6.weights.weightKg.value, 3.6);
});

test('DB Phase 8: N/A fitting source values remain unavailable and never become zero', () => {
  const rows = parseButtweldFittingTable(fs.readFileSync(ELBOW, 'utf8'), { source: ELBOW });
  const quarter = rows.find((row) => row.nps === '0+1/4');
  assert.equal(quarter.dataStatus, 'PARTIAL');
  assert.equal(quarter.dimensions.odMm.value, null);
  assert.equal(quarter.dimensions.odMm.basis, 'UNAVAILABLE');
  assert.notEqual(quarter.dimensions.odMm.value, 0);
});

test('DB Phase 8: committed fitting sample catalog is source-backed and indexed', () => {
  const catalog = readJson(CATALOG);
  const index = readJson(INDEX);
  assert.equal(catalog.metadata.sourceRoot, 'docs/Pipedata/Database/Ftbw');
  assert.equal(catalog.metadata.generationMode, 'SOURCE_BACKED_SAMPLE_EXPANSION');
  assert.equal(catalog.rows.length, 9);
  assert.deepEqual(validateFittingRows(catalog.rows), []);
  assert.deepEqual(index.byKey, buildFittingIndex(catalog.rows).byKey);
  const hit = lookupFittingRecord(catalog.rows, { subtype: 'CAP', nps: '6', schedule: '40', unitSystem: 'METRIC' });
  assert.equal(hit.ok, true);
  assert.equal(hit.row.dimensions.overCapMm.value, 89);
});

test('DB Phase 8: fitting catalog modules and gate stay under 300 lines', () => {
  for (const path of ['src/db/fittingCatalog.js', 'gates/db-phase-08-fittings.gate.test.js']) {
    const lines = fs.readFileSync(path, 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${path} has ${lines} lines`);
  }
});
