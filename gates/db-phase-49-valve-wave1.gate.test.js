import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const valves = readJson('data/normalized/valves.json');
const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: { 'data/normalized/valves.json': valves },
};
const row = (id) => valves.rows.find((item) => item.id === id);

test('DB Phase 49: Class 1500 gate valve rows are source-backed', () => {
  assert.equal(valves.metadata.phase, 'DB_PHASE_49');
  assert.equal(valves.metadata.generationMode, 'SOURCE_BACKED_WAVE_1_EXPANSION');
  assert.equal(valves.rows.length, 8);
  const gate4 = row('VALVE|GATE|FLANGED|NPS4|CL1500|RF');
  assert.equal(gate4.source, 'docs/Pipedata/Database/Vlfl/VLV11500.csv');
  assert.equal(gate4.sourceRowNumber, 13);
  assert.equal(gate4.dimensions.faceToFaceRfMm.value, 546);
  assert.equal(gate4.dimensions.faceToFaceRtjMm.value, 549);
  assert.equal(gate4.weights.rfRtjKg.value, 277);
});

test('DB Phase 49: valve exact lookup includes Class 1500 rows without fallback', () => {
  const hit = lookupComponentExact('gate valve 4 1500 rf', assets, { filters: { componentType: 'VALVE', valveType: 'GATE', nps: '4', classRating: '1500', facing: 'RF' } });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'VALVE|GATE|FLANGED|NPS4|CL1500|RF');
  const miss = lookupComponentExact('gate valve 4 300 rf', assets, { filters: { componentType: 'VALVE', valveType: 'GATE', nps: '4', classRating: '300', facing: 'RF' } });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 49: partial Class 150 NPS22 keeps unavailable face-to-face fields', () => {
  const partial = row('VALVE|GATE|FLANGED|NPS22|CL150|RF');
  assert.equal(partial.dataStatus, 'PARTIAL');
  assert.equal(partial.dimensions.faceToFaceRfMm.value, null);
  assert.equal(partial.dimensions.faceToFaceRfMm.basis, 'UNAVAILABLE');
});
