import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const controlValves = readJson('data/normalized/valves-control-expanded.json');
const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: { 'data/normalized/valves-control-expanded.json': controlValves },
};

test('DB Phase 76: Control Valve expansion matches criteria', () => {
  assert.equal(controlValves.summary.expansionPack, 'DB_PHASE_76_VALVE_CONTROL_EXPANSION');
  assert.ok(controlValves.rows.length >= 60);
  assert.ok(controlValves.rows.every(row => row.valveType === 'CONTROL'));

  const vlv4 = controlValves.rows.find(row => row.id === 'VALVE|CONTROL|FLANGED|NPS4|CL150|RF');
  assert.ok(vlv4);
  assert.equal(vlv4.dimensions.faceToFaceRfMm.value, 352.425);
  assert.equal(vlv4.dimensions.diaphragmDiaMm.value, 406.4);
  
  for (const row of controlValves.rows) {
    assert.ok(!Object.values(row.valueBasis ?? {}).includes('FABRICATED'));
  }
});

test('DB Phase 76: exact Control Valve lookup', () => {
  const hit = lookupComponentExact('VALVE CONTROL FLANGED 4 150 RF', assets, {
    filters: { componentType: 'VALVE', valveType: 'CONTROL', nps: '4', classRating: '150', facing: 'RF' }
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'VALVE|CONTROL|FLANGED|NPS4|CL150|RF');

  const miss = lookupComponentExact('VALVE CONTROL FLANGED 4 150000 RF', assets, {
    filters: { componentType: 'VALVE', valveType: 'CONTROL', nps: '4', classRating: '150000', facing: 'RF' }
  });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
