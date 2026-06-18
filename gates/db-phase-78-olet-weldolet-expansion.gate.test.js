import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const wol = readJson('data/normalized/olets-weldolet.json');
const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: { 'data/normalized/olets-weldolet.json': wol },
};

test('DB Phase 78: Weldolet expansion matches criteria', () => {
  assert.equal(wol.summary.expansionPack, 'DB_PHASE_78_OLET_WELDOLET_EXPANSION');
  assert.ok(wol.rows.length >= 70);
  assert.ok(wol.rows.every(row => row.oletType === 'WELDOLET'));
  
  const schedules = [...new Set(wol.rows.map(row => row.scheduleOrRating))].sort();
  assert.deepEqual(schedules, ['SCH160', 'SCHSTD', 'SCHXS', 'SCHXXS']);

  const wol4 = wol.rows.find(row => row.id === 'OLET|WELDOLET|NPS4|SCHSTD');
  assert.ok(wol4);
  assert.equal(wol4.dimensions.heightAMm.value, 50.8);
  assert.equal(wol4.dimensions.odMm.value, 152.4);
  assert.equal(wol4.weights.weightKg.value, 2.86);

  for (const row of wol.rows) {
    assert.ok(!Object.values(row.dimensions).concat(Object.values(row.weights)).some(d => d.basis === 'FABRICATED'));
  }
});

test('DB Phase 78: exact Weldolet lookup', () => {
  const hit = lookupComponentExact('OLET WELDOLET 4 SCHSTD', assets, {
    filters: { componentType: 'OLET', oletType: 'WELDOLET', nps: '4' }
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'OLET|WELDOLET|NPS4|SCHSTD');

  const miss = lookupComponentExact('OLET WELDOLET 4 SCHSCHEME999', assets, {
    filters: { componentType: 'OLET', oletType: 'WELDOLET', nps: '4', scheduleOrRating: 'SCHSCHEME999' }
  });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
