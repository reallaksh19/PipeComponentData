import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const cl900 = readJson('data/normalized/flanges-cl900-expanded.json');
const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: { 'data/normalized/flanges-cl900-expanded.json': cl900 },
};

test('DB Phase 71: Class 900 flange expansion matches criteria', () => {
  assert.equal(cl900.summary.expansionPack, 'DB_PHASE_71_FLANGE_CL900_EXPANSION');
  assert.ok(cl900.rows.length >= 30);
  assert.ok(cl900.rows.every(row => row.classRating === '900'));
  assert.ok(cl900.rows.every(row => row.subtype !== 'SO'));
  
  const wn4 = cl900.rows.find(row => row.id === 'FLANGE|WN|NPS4|CL900|METRIC');
  assert.ok(wn4);
  assert.equal(wn4.flangeOdMm, 290);
  assert.equal(wn4.weightKg, 23);
  
  // Assert no fabricated values
  for (const row of cl900.rows) {
    assert.ok(!Object.values(row.valueBasis ?? {}).includes('FABRICATED'));
  }
});

test('DB Phase 71: exact flange lookup for Class 900', () => {
  const hit = lookupComponentExact('FLG900 4 WN', assets, {
    filters: { componentType: 'FLANGE', subtype: 'WN', nps: '4', classRating: '900' }
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'FLANGE|WN|NPS4|CL900|METRIC');

  const miss = lookupComponentExact('FLG9000 4 WN', assets, {
    filters: { componentType: 'FLANGE', subtype: 'WN', nps: '4', classRating: '9000' }
  });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
