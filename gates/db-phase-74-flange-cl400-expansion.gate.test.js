import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const cl400 = readJson('data/normalized/flanges-cl400-expanded.json');
const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: { 'data/normalized/flanges-cl400-expanded.json': cl400 },
};

test('DB Phase 74: Class 400 flange expansion matches criteria', () => {
  assert.equal(cl400.summary.expansionPack, 'DB_PHASE_74_FLANGE_CL400_EXPANSION');
  assert.ok(cl400.rows.length >= 30);
  assert.ok(cl400.rows.every(row => row.classRating === '400'));
  assert.ok(cl400.rows.every(row => row.subtype !== 'SO'));

  const wnHalf = cl400.rows.find(row => row.id === 'FLANGE|WN|NPS0+1/2|CL400|METRIC');
  assert.ok(wnHalf);
  assert.equal(wnHalf.flangeOdMm, 95);
  assert.equal(wnHalf.weightKg, 1.5);
  
  for (const row of cl400.rows) {
    assert.ok(!Object.values(row.valueBasis ?? {}).includes('FABRICATED'));
  }
});

test('DB Phase 74: exact flange lookup for Class 400', () => {
  const hit = lookupComponentExact('FLG400 0+1/2 WN', assets, {
    filters: { componentType: 'FLANGE', subtype: 'WN', nps: '0+1/2', classRating: '400' }
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'FLANGE|WN|NPS0+1/2|CL400|METRIC');

  const miss = lookupComponentExact('FLG4000 0+1/2 WN', assets, {
    filters: { componentType: 'FLANGE', subtype: 'WN', nps: '0+1/2', classRating: '4000' }
  });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
