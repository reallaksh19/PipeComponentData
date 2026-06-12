import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseValveTable, buildValveIndex, lookupValveRecord } from '../src/db/valveCatalog.js';

const SOURCE = 'docs/Pipedata/Database/Vlfl/VLV1150.csv';
const CATALOG = 'data/normalized/valves.json';
const INDEX = 'data/indexes/valve.index.json';
const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

test('DB Phase 7: VLV1150 source table parses exact gate-valve dimensions', () => {
  const rows = parseValveTable(fs.readFileSync(SOURCE, 'utf8'), { source: SOURCE });
  const gate8 = rows.find((row) => row.nps === '8');
  assert.equal(rows.length, 28);
  assert.equal(gate8.sourceRowNumber, 16);
  assert.equal(gate8.dimensions.faceToFaceRfMm.value, 292);
  assert.equal(gate8.dimensions.faceToFaceRtjMm.value, 305);
  assert.equal(gate8.dimensions.buttWeldLengthMm.value, 419);
  assert.equal(gate8.weights.rfRtjKg.value, 144);
});

test('DB Phase 7: N/A source valve values remain unavailable and never become zero', () => {
  const rows = parseValveTable(fs.readFileSync(SOURCE, 'utf8'), { source: SOURCE });
  const gate22 = rows.find((row) => row.nps === '22');
  assert.equal(gate22.dataStatus, 'PARTIAL');
  assert.equal(gate22.dimensions.faceToFaceRfMm.value, null);
  assert.equal(gate22.dimensions.faceToFaceRfMm.basis, 'UNAVAILABLE');
  assert.equal(gate22.dimensions.buttWeldLengthMm.value, 762);
  assert.notEqual(gate22.dimensions.faceToFaceRfMm.value, 0);
});

test('DB Phase 7: committed valve sample catalog is source-backed and indexed', () => {
  const catalog = readJson(CATALOG);
  const index = readJson(INDEX);
  assert.equal(catalog.metadata.sourceRoot, 'docs/Pipedata/Database/Vlfl');
  assert.equal(catalog.metadata.generationMode, 'SOURCE_BACKED_SAMPLE_EXPANSION');
  assert.equal(catalog.rows.length, 5);
  const { index: built, duplicates } = buildValveIndex(catalog.rows);
  assert.deepEqual(duplicates, []);
  assert.deepEqual(index.byKey, built);
  const hit = lookupValveRecord(catalog.rows, {
    valveType: 'GATE', endType: 'FLANGED', nps: '4', classRating: '150', facing: 'RF',
  });
  assert.equal(hit.ok, true);
  assert.equal(hit.row.weights.rfRtjKg.value, 52);
});

test('DB Phase 7: valve catalog modules and gate stay under 300 lines', () => {
  for (const path of ['src/db/valveCatalog.js', 'gates/db-phase-07-valves.gate.test.js']) {
    const lines = fs.readFileSync(path, 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${path} has ${lines} lines`);
  }
});
