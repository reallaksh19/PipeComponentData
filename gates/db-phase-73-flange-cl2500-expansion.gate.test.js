import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const cl2500 = readJson('data/normalized/flanges-cl2500-expanded.json');
const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: { 'data/normalized/flanges-cl2500-expanded.json': cl2500 },
};

test('DB Phase 73: Class 2500 flange expansion matches criteria', () => {
  assert.equal(cl2500.summary.expansionPack, 'DB_PHASE_73_FLANGE_CL2500_EXPANSION');
  assert.ok(cl2500.rows.length >= 16);
  assert.ok(cl2500.rows.every(row => row.classRating === '2500'));
  assert.ok(cl2500.rows.every(row => row.subtype !== 'SO'));
  
  // Assert NPS 14-24 skipped
  const excludedNps = ['14', '16', '18', '20', '22', '24'];
  for (const row of cl2500.rows) {
    assert.equal(excludedNps.includes(row.nps), false, `NPS ${row.nps} should be excluded`);
  }

  const wn12 = cl2500.rows.find(row => row.id === 'FLANGE|WN|NPS12|CL2500|METRIC');
  assert.ok(wn12);
  assert.equal(wn12.flangeOdMm, 760);
  assert.equal(wn12.weightKg, 695);
  
  for (const row of cl2500.rows) {
    assert.ok(!Object.values(row.valueBasis ?? {}).includes('FABRICATED'));
  }
});

test('DB Phase 73: exact flange lookup for Class 2500', () => {
  const hit = lookupComponentExact('FLG2500 12 WN', assets, {
    filters: { componentType: 'FLANGE', subtype: 'WN', nps: '12', classRating: '2500' }
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'FLANGE|WN|NPS12|CL2500|METRIC');

  const miss = lookupComponentExact('FLG25000 12 WN', assets, {
    filters: { componentType: 'FLANGE', subtype: 'WN', nps: '12', classRating: '25000' }
  });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
