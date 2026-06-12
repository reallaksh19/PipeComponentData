import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const flanges = readJson('data/normalized/flanges.json');
const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: { 'data/normalized/flanges.json': flanges },
};
const row = (id) => flanges.rows.find((item) => item.id === id);

test('DB Phase 48: Class 150 flange wave 1 rows are source-backed', () => {
  assert.equal(flanges.summary.expansionPack, 'DB_PHASE_48_FLANGE_WAVE_1');
  assert.equal(flanges.summary.generationMode, 'SOURCE_BACKED_WAVE_1_EXPANSION');
  assert.equal(flanges.rows.length, 18);
  const wn4 = row('FLANGE|WN|NPS4|CL150|METRIC');
  assert.equal(wn4.source, 'docs/Pipedata/Database/Flan/Flg150.csv');
  assert.equal(wn4.sourceRow, 14);
  assert.equal(wn4.flangeOdMm, 230);
  assert.equal(wn4.hubXMm, 135);
  assert.equal(wn4.weightKg, 6.8);
});

test('DB Phase 48: blind rows keep unavailable hub/weld fields explicit', () => {
  const blind = row('FLANGE|BLIND|NPS6|CL150|METRIC');
  assert.equal(blind.weightKg, 11.8);
  assert.equal(blind.hubXMm, null);
  assert.equal(blind.weldDiaMm, null);
  assert.equal(blind.valueBasis.hubXMm, 'UNAVAILABLE');
  assert.equal(blind.valueBasis.weldDiaMm, 'UNAVAILABLE');
});

test('DB Phase 48: flange exact lookup includes Class 150 rows without fallback', () => {
  const hit = lookupComponentExact('FLG150 4 WN', assets, { filters: { componentType: 'FLANGE', subtype: 'WN', nps: '4', classRating: '150' } });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'FLANGE|WN|NPS4|CL150|METRIC');
  const miss = lookupComponentExact('FLG600 4 WN', assets, { filters: { componentType: 'FLANGE', subtype: 'WN', nps: '4', classRating: '600' } });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
