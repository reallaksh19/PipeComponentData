import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const fittings = readJson('data/normalized/fittings.json');
const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: { 'data/normalized/fittings.json': fittings },
};
const row = (id) => fittings.rows.find((item) => item.id === id);

test('DB Phase 50: BW fitting wave 1 rows are source-backed', () => {
  assert.equal(fittings.metadata.phase, 'DB_PHASE_50');
  assert.equal(fittings.metadata.generationMode, 'SOURCE_BACKED_WAVE_1_EXPANSION');
  assert.equal(fittings.rows.length, 15);
  const elbow45 = row('FITTING|ELBOW_45|NPS4|SCH40|METRIC');
  assert.equal(elbow45.source, 'docs/Pipedata/Database/Ftbw/45Elbow40.csv');
  assert.equal(elbow45.dimensions.radiusMm.value, 151.60625);
  assert.equal(elbow45.weights.weightKg.value, 1.95);
  const elbow80 = row('FITTING|ELBOW_90|NPS4|SCH80|METRIC');
  assert.equal(elbow80.source, 'docs/Pipedata/Database/Ftbw/90Elbow80.csv');
  assert.equal(elbow80.weights.weightKg.value, 5.4);
});

test('DB Phase 50: fitting exact lookup includes wave 1 rows without fallback', () => {
  const hit = lookupComponentExact('90 elbow 4 schedule 80', assets, { filters: { componentType: 'FITTING', subtype: 'ELBOW_90', nps: '4', schedule: '80' } });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'FITTING|ELBOW_90|NPS4|SCH80|METRIC');
  const miss = lookupComponentExact('cap 6 schedule 80', assets, { filters: { componentType: 'FITTING', subtype: 'CAP', nps: '6', schedule: '80' } });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 50: reducer remains unpromoted in this wave', () => {
  assert.equal(fittings.rows.some((item) => /REDUCER/.test(item.subtype ?? '')), false);
});
