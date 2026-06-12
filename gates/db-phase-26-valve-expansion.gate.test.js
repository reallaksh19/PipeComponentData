import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { componentSearch, SEARCH_MODE } from '../src/db/componentSearch.js';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/db/lookupComponentExact.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const valves = readJson('data/normalized/valves.json');
const searchIndex = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json').rows;

test('DB Phase 26: valve catalog promotes bounded source-backed samples only', () => {
  assert.equal(valves.metadata.phase, 'DB_PHASE_26');
  assert.equal(valves.metadata.generationMode, 'SOURCE_BACKED_SAMPLE_EXPANSION');
  assert.equal(valves.metadata.sampledRowCount, 5);
  assert.equal(valves.rows.length, 5);
  assert.ok(valves.rows.every((row) => row.source === 'docs/Pipedata/Database/Vlfl/VLV1150.csv'));
  assert.ok(valves.rows.every((row) => row.datasetVersion === 'pipedata-db/2026.06.dbphase26'));
});

test('DB Phase 26: promoted Class 150 gate valve values are pinned to source rows', () => {
  const gate4 = valves.rows.find((row) => row.id === 'VALVE|GATE|FLANGED|NPS4|CL150|RF');
  assert.equal(gate4.sourceRowNumber, 13);
  assert.equal(gate4.dimensions.faceToFaceRfMm.value, 229);
  assert.equal(gate4.dimensions.faceToFaceRtjMm.value, 242);
  assert.equal(gate4.weights.rfRtjKg.value, 52);
  const partial = valves.rows.find((row) => row.nps === '22');
  assert.equal(partial.dataStatus, 'PARTIAL');
  assert.equal(partial.dimensions.faceToFaceRfMm.value, null);
  assert.equal(partial.dimensions.faceToFaceRfMm.basis, 'UNAVAILABLE');
});

test('DB Phase 26: valve lookup remains exact and no nearest-class fallback is allowed', () => {
  const hit = lookupComponentExact({
    query: 'gate valve 4 150 rf', searchIndex, catalogs: { 'data/normalized/valves.json': valves }, aliases,
    filters: { componentType: 'VALVE', valveType: 'GATE', nps: '4', classRating: '150', facing: 'RF' },
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.dimensions.faceToFaceRfMm.value, 229);
  const miss = componentSearch('gate valve 4 300 rf', searchIndex, {
    aliases, mode: SEARCH_MODE.EXACT_ALIAS_ONLY,
    filters: { componentType: 'VALVE', valveType: 'GATE', nps: '4', classRating: '300', facing: 'RF' },
  });
  assert.equal(miss.ok, false);
});
