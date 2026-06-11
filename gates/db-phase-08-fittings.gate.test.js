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

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

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
  const tee4 = parseButtweldFittingTable(fs.readFileSync(TEE, 'utf8'), { source: TEE }).find((row) => row.nps === '4');
  assert.equal(tee4.dimensions.centerToEndMm.value, 105);
  assert.equal(tee4.dimensions.branchCenterToEndMm.value, 105);
  assert.equal(tee4.weights.weightKg.value, 6);
  const cap4 = parseButtweldFittingTable(fs.readFileSync(CAP, 'utf8'), { source: CAP }).find((row) => row.nps === '4');
  assert.equal(cap4.dimensions.overCapMm.value, 64);
  assert.equal(cap4.dimensions.overCapE1Mm.value, 76);
  assert.equal(cap4.weights.weightKg.value, 1.6);
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
  assert.equal(catalog.metadata.generationMode, 'SOURCE_TABLE_IN_REPO_SAMPLE_ROWS');
  assert.deepEqual(validateFittingRows(catalog.rows), []);
  assert.deepEqual(index.byKey, buildFittingIndex(catalog.rows).byKey);
  const hit = lookupFittingRecord(catalog.rows, { subtype: 'ELBOW_90', nps: '4', schedule: '40', unitSystem: 'METRIC' });
  assert.equal(hit.ok, true);
  assert.equal(hit.row.dimensions.centerToEndMm.value, 152);
});

test('DB Phase 8: fitting catalog modules and gate stay under 200 lines', () => {
  for (const path of ['src/db/fittingCatalog.js', 'gates/db-phase-08-fittings.gate.test.js']) {
    const lines = fs.readFileSync(path, 'utf8').split('\n').length;
    assert.ok(lines <= 200, `${path} has ${lines} lines`);
  }
});
