import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupValveRecord } from '../src/db/valveCatalog.js';

const CATALOG = 'data/normalized/valves.json';
const INDEX = 'data/indexes/valve.index.json';
const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

test('DB Phase 7: committed valve wave catalog is source-backed and indexed', () => {
  const catalog = readJson(CATALOG);
  const index = readJson(INDEX);
  assert.equal(catalog.schema, 'pipedata-normalized-valves/v1');
  assert.equal(catalog.metadata.sourceRoot, 'docs/Pipedata/Database/Vlfl');
  assert.equal(catalog.metadata.generationMode, 'SOURCE_BACKED_WAVE_1_EXPANSION');
  assert.equal(catalog.metadata.sourceFiles.includes('docs/Pipedata/Database/Vlfl/VLV1150.csv'), true);
  assert.equal(catalog.metadata.sourceFiles.includes('docs/Pipedata/Database/Vlfl/VLV11500.csv'), true);
  assert.equal(catalog.rows.length, 8);
  assert.equal(index.metadata.rowCount, 8);
  for (const row of catalog.rows) assert.equal(index.byKey[row.id], row.id);
});

test('DB Phase 7: Class 150 and Class 1500 valve source values are preserved', () => {
  const catalog = readJson(CATALOG);
  const gate4 = catalog.rows.find((row) => row.id === 'VALVE|GATE|FLANGED|NPS4|CL150|RF');
  assert.equal(gate4.source, 'docs/Pipedata/Database/Vlfl/VLV1150.csv');
  assert.equal(gate4.sourceRowNumber, 13);
  assert.equal(gate4.dimensions.faceToFaceRfMm.value, 229);
  assert.equal(gate4.weights.rfRtjKg.value, 52);
  const gate1500 = catalog.rows.find((row) => row.id === 'VALVE|GATE|FLANGED|NPS4|CL1500|RF');
  assert.equal(gate1500.source, 'docs/Pipedata/Database/Vlfl/VLV11500.csv');
  assert.equal(gate1500.sourceRowNumber, 13);
  assert.equal(gate1500.dimensions.faceToFaceRfMm.value, 546);
  assert.equal(gate1500.dimensions.faceToFaceRtjMm.value, 549);
  assert.equal(gate1500.weights.rfRtjKg.value, 277);
});

test('DB Phase 7: unavailable source valve values remain null and never become zero', () => {
  const catalog = readJson(CATALOG);
  const gate22 = catalog.rows.find((row) => row.id === 'VALVE|GATE|FLANGED|NPS22|CL150|RF');
  assert.equal(gate22.dataStatus, 'PARTIAL');
  assert.equal(gate22.dimensions.faceToFaceRfMm.value, null);
  assert.equal(gate22.dimensions.faceToFaceRfMm.basis, 'UNAVAILABLE');
  assert.equal(gate22.dimensions.buttWeldLengthMm.value, 762);
  assert.notEqual(gate22.dimensions.faceToFaceRfMm.value, 0);
});

test('DB Phase 7: valve exact catalog lookup stays key-based', () => {
  const catalog = readJson(CATALOG);
  const hit = lookupValveRecord(catalog.rows, {
    valveType: 'GATE', endType: 'FLANGED', nps: '4', classRating: '1500', facing: 'RF',
  });
  assert.equal(hit.ok, true);
  assert.equal(hit.row.weights.rfRtjKg.value, 277);
  const miss = lookupValveRecord(catalog.rows, {
    valveType: 'GATE', endType: 'FLANGED', nps: '4', classRating: '300', facing: 'RF',
  });
  assert.equal(miss.ok, false);
});

test('DB Phase 7: valve catalog modules and gate stay under 300 lines', () => {
  for (const path of ['src/db/valveCatalog.js', 'gates/db-phase-07-valves.gate.test.js']) {
    const lines = fs.readFileSync(path, 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${path} has ${lines} lines`);
  }
});
