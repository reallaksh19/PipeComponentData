import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const globeValves = readJson('data/normalized/valves-globe-expanded.json');
const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: { 'data/normalized/valves-globe-expanded.json': globeValves },
};

test('DB Phase 75: Globe Valve expansion matches criteria', () => {
  assert.equal(globeValves.summary.expansionPack, 'DB_PHASE_75_VALVE_GLOBE_EXPANSION');
  assert.ok(globeValves.rows.length >= 80);
  assert.ok(globeValves.rows.every(row => row.valveType === 'GLOBE'));

  const vlv2 = globeValves.rows.find(row => row.id === 'VALVE|GLOBE|FLANGED|NPS2|CL150|RF');
  assert.ok(vlv2);
  assert.equal(vlv2.dimensions.faceToFaceRfMm.value, 203);
  
  for (const row of globeValves.rows) {
    assert.ok(!Object.values(row.valueBasis ?? {}).includes('FABRICATED'));
  }
});

test('DB Phase 75: exact Globe Valve lookup', () => {
  const hit = lookupComponentExact('VALVE GLOBE FLANGED 2 150 RF', assets, {
    filters: { componentType: 'VALVE', valveType: 'GLOBE', nps: '2', classRating: '150', facing: 'RF' }
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'VALVE|GLOBE|FLANGED|NPS2|CL150|RF');

  const miss = lookupComponentExact('VALVE GLOBE FLANGED 2 150000 RF', assets, {
    filters: { componentType: 'VALVE', valveType: 'GLOBE', nps: '2', classRating: '150000', facing: 'RF' }
  });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
