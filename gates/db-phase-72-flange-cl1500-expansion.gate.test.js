import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const cl1500 = readJson('data/normalized/flanges-cl1500-expanded.json');
const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: { 'data/normalized/flanges-cl1500-expanded.json': cl1500 },
};

test('DB Phase 72: Class 1500 flange expansion matches criteria', () => {
  assert.equal(cl1500.summary.expansionPack, 'DB_PHASE_72_FLANGE_CL1500_EXPANSION');
  assert.ok(cl1500.rows.length >= 30);
  assert.ok(cl1500.rows.every(row => row.classRating === '1500'));
  assert.ok(cl1500.rows.every(row => row.subtype !== 'SO'));
  
  const wn12 = cl1500.rows.find(row => row.id === 'FLANGE|WN|NPS12|CL1500|METRIC');
  assert.ok(wn12);
  assert.equal(wn12.flangeOdMm, 675);
  assert.equal(wn12.weightKg, 314);
  
  for (const row of cl1500.rows) {
    assert.ok(!Object.values(row.valueBasis ?? {}).includes('FABRICATED'));
  }
});

test('DB Phase 72: exact flange lookup for Class 1500', () => {
  const hit = lookupComponentExact('FLG1500 12 WN', assets, {
    filters: { componentType: 'FLANGE', subtype: 'WN', nps: '12', classRating: '1500' }
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'FLANGE|WN|NPS12|CL1500|METRIC');

  const miss = lookupComponentExact('FLG15000 12 WN', assets, {
    filters: { componentType: 'FLANGE', subtype: 'WN', nps: '12', classRating: '15000' }
  });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
