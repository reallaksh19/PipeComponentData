import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupFlangeCatalogRecord } from '../src/db/flangeCatalog.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const flanges = readJson('data/normalized/flanges.json');
const index = readJson('data/indexes/flange.index.json');
const dataset = { ...flanges, index };

test('DB Phase 80: promoted flanges match expected WN and BLIND rules', () => {
  assert.equal(flanges.summary.expansionPack, 'DB_PHASE_80_FLANGE_FULL_PROMOTION');
  assert.equal(flanges.rows.length, 276);

  const subtypes = new Set(flanges.rows.map(r => r.subtype));
  assert.ok(subtypes.has('WN'));
  assert.ok(subtypes.has('BLIND'));
  assert.ok(!subtypes.has('SO'));

  const classes = new Set(flanges.rows.map(r => r.classRating));
  assert.deepEqual([...classes].sort(), ['150', '1500', '2500', '300', '600', '900']);
  assert.ok(!classes.has('400'));

  const wn = flanges.rows.find(r => r.id === 'FLANGE|WN|NPS2|CL150|METRIC');
  assert.ok(wn);
  assert.equal(wn.flangeOdMm, 150);
  assert.equal(wn.weightKg, 2.7);

  const blind = flanges.rows.find(r => r.id === 'FLANGE|BLIND|NPS2|CL150|METRIC');
  assert.ok(blind);
  assert.equal(blind.blindThicknessMm, 17.5);
  assert.equal(blind.weightKg, 2.3);
});

test('DB Phase 80: lookups and negative fixtures', () => {
  // Positive lookup WN
  const hitWn = lookupFlangeCatalogRecord(dataset, { subtype: 'WN', nps: '2', classRating: '150' });
  assert.equal(hitWn.ok, true);
  assert.equal(hitWn.row.id, 'FLANGE|WN|NPS2|CL150|METRIC');

  // Positive lookup BLIND
  const hitBlind = lookupFlangeCatalogRecord(dataset, { subtype: 'BLIND', nps: '2', classRating: '150' });
  assert.equal(hitBlind.ok, true);
  assert.equal(hitBlind.row.id, 'FLANGE|BLIND|NPS2|CL150|METRIC');

  // Negative fixture 1: SO subtype is lookup miss
  const missSo = lookupFlangeCatalogRecord(dataset, { subtype: 'SO', nps: '2', classRating: '150' });
  assert.equal(missSo.ok, false);

  // Negative fixture 2: CL400 is lookup miss
  const missCl400 = lookupFlangeCatalogRecord(dataset, { subtype: 'WN', nps: '2', classRating: '400' });
  assert.equal(missCl400.ok, false);
});
