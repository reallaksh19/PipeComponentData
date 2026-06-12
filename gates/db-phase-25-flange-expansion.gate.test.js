import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const flanges = readJson('data/normalized/flanges.json');
const cl600 = readJson('data/normalized/flanges-cl600-wave2.json');
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const catalogs = {
  'data/normalized/pipes.json': readJson('data/normalized/pipes.json'),
  'data/normalized/pipes-sch80-wave2.json': readJson('data/normalized/pipes-sch80-wave2.json'),
  'data/normalized/flanges.json': flanges,
  'data/normalized/flanges-cl600-wave2.json': cl600,
  'data/normalized/valves.json': readJson('data/normalized/valves.json'),
  'data/normalized/fittings.json': readJson('data/normalized/fittings.json'),
  'data/normalized/gaskets.json': readJson('data/normalized/gaskets.json'),
  'data/normalized/supports.json': readJson('data/normalized/supports.json'),
};
const assets = { searchIndex: index, aliases, catalogs };
const row = (id) => [...flanges.rows, ...cl600.rows].find((item) => item.id === id);

test('DB Phase 25: flange wave expansion stays source-backed and partial', () => {
  assert.equal(flanges.summary.generationMode, 'SOURCE_BACKED_WAVE_1_EXPANSION');
  assert.equal(flanges.summary.sampledRowCount, 18);
  assert.equal(cl600.summary.generationMode, 'SOURCE_BACKED_WAVE_2_EXPANSION');
  assert.equal(cl600.summary.sampledRowCount, 9);
  assert.equal(flanges.rows.length + cl600.rows.length, 27);
});

test('DB Phase 25: promoted Class 300, 150 and 600 flange values match committed source rows', () => {
  const wn2 = row('FLANGE|WN|NPS2|CL300|METRIC');
  assert.equal(wn2.sourceRow, 10);
  assert.equal(wn2.flangeOdMm, 165);
  assert.equal(wn2.weightKg, 4.1);
  const wn4 = row('FLANGE|WN|NPS4|CL150|METRIC');
  assert.equal(wn4.sourceRow, 14);
  assert.equal(wn4.flangeOdMm, 230);
  assert.equal(wn4.hubXMm, 135);
  assert.equal(wn4.weightKg, 6.8);
  const cl600Blind6 = row('FLANGE|BLIND|NPS6|CL600|METRIC');
  assert.equal(cl600Blind6.blindThicknessMm, 67);
  assert.equal(cl600Blind6.weightKg, 39);
  assert.equal(cl600Blind6.valueBasis.hubXMm, 'UNAVAILABLE');
});

test('DB Phase 25: exact flange lookup works and wrong class still does not fallback', () => {
  const found = lookupComponentExact('FLG150 4 WN', assets, {
    filters: { componentType: 'FLANGE', subtype: 'WN', nps: '4', classRating: '150' },
  });
  assert.equal(found.status, LOOKUP_STATUS.FOUND);
  assert.equal(found.row.id, 'FLANGE|WN|NPS4|CL150|METRIC');
  const cl600Found = lookupComponentExact('FLG600 4 WN', assets, {
    filters: { componentType: 'FLANGE', subtype: 'WN', nps: '4', classRating: '600' },
  });
  assert.equal(cl600Found.status, LOOKUP_STATUS.FOUND);
  assert.equal(cl600Found.row.id, 'FLANGE|WN|NPS4|CL600|METRIC');
  const wrong = lookupComponentExact('FLG900 4 WN', assets, {
    filters: { componentType: 'FLANGE', subtype: 'WN', nps: '4', classRating: '900' },
  });
  assert.equal(wrong.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 25: every promoted flange row is indexed and non-fabricated', () => {
  const indexed = new Set(index.entries.filter((entry) => entry.family === 'FLANGE').map((entry) => entry.id));
  for (const flange of [...flanges.rows, ...cl600.rows]) {
    assert.equal(indexed.has(flange.id), true, `${flange.id} missing from index`);
    assert.ok(!Object.values(flange.valueBasis).includes('FABRICATED'));
  }
});
