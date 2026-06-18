import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const sol = readJson('data/normalized/olets-sockolet.json');
const tol = readJson('data/normalized/olets-thredolet.json');
const eol = readJson('data/normalized/olets-elbolet.json');

const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: {
    'data/normalized/olets-sockolet.json': sol,
    'data/normalized/olets-thredolet.json': tol,
    'data/normalized/olets-elbolet.json': eol
  },
};

test('DB Phase 79: Sockolet, Thredolet, Elbolet expansion matches criteria', () => {
  assert.ok(sol.rows.length >= 20);
  assert.ok(tol.rows.length >= 20);
  assert.ok(eol.rows.length >= 10);

  assert.ok(sol.rows.every(row => row.oletType === 'SOCKOLET'));
  assert.ok(tol.rows.every(row => row.oletType === 'THREDOLET'));
  assert.ok(eol.rows.every(row => row.oletType === 'ELBOLET'));

  const sol4 = sol.rows.find(row => row.id === 'OLET|SOCKOLET|NPS4|3000');
  assert.ok(sol4);
  assert.equal(sol4.dimensions.heightAMm.value, 57.15);
  assert.equal(sol4.dimensions.socketBoreMm.value, 102.26);
  assert.equal(sol4.weights.weightKg.value, 3.29);

  const tol1 = tol.rows.find(row => row.id === 'OLET|THREDOLET|NPS1|3000');
  assert.ok(tol1);
});

test('DB Phase 79: exact Sockolet lookup', () => {
  const hit = lookupComponentExact('OLET SOCKOLET 4 3000', assets, {
    filters: { componentType: 'OLET', oletType: 'SOCKOLET', nps: '4' }
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'OLET|SOCKOLET|NPS4|3000');

  const miss = lookupComponentExact('OLET SOCKOLET 4 99999', assets, {
    filters: { componentType: 'OLET', oletType: 'SOCKOLET', nps: '4', scheduleOrRating: '99999' }
  });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
