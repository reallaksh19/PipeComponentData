import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const flanges = readJson('data/normalized/flanges-cl600-wave3.json');
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((artifact) => artifact.kind === 'NORMALIZED_DATA').map((artifact) => [artifact.path, readJson(artifact.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };

test('DB Phase 59: bounded Class 600 flange wave 3 addendum is source-backed', () => {
  assert.equal(flanges.schema, 'pipedata-normalized-flanges/v1');
  assert.equal(flanges.summary.expansionPack, 'DB_PHASE_59_FLANGE_CL600_WAVE3_PROMOTION');
  assert.equal(flanges.summary.generationMode, 'SOURCE_BACKED_WAVE_3_EXPANSION');
  assert.equal(flanges.rows.length, 6);
  assert.deepEqual([...new Set(flanges.rows.map((row) => row.nps))], ['8', '10']);
});

test('DB Phase 59: promoted Class 600 values match Flg600 source rows', () => {
  const byId = Object.fromEntries(flanges.rows.map((row) => [row.id, row]));
  assert.equal(byId['FLANGE|WN|NPS8|CL600|METRIC'].weightKg, 55);
  assert.equal(byId['FLANGE|SO|NPS8|CL600|METRIC'].soBoreMm, 221.5);
  assert.equal(byId['FLANGE|BLIND|NPS10|CL600|METRIC'].blindThicknessMm, 86);
  assert.equal(byId['FLANGE|BLIND|NPS10|CL600|METRIC'].valueBasis.hubXMm, 'UNAVAILABLE');
  assert.equal(byId['FLANGE|WN|NPS10|CL600|METRIC'].boltCount, 16);
  for (const row of flanges.rows) assert.ok(!Object.values(row.valueBasis).includes('FABRICATED'));
});

test('DB Phase 59: exact lookup resolves wave 3 CL600 and rejects unpromoted CL900', () => {
  const found = lookupComponentExact('FLG600 10 BLIND', assets, { filters: { componentType: 'FLANGE', subtype: 'BLIND', nps: '10', classRating: '600' } });
  assert.equal(found.status, LOOKUP_STATUS.FOUND);
  assert.equal(found.row.id, 'FLANGE|BLIND|NPS10|CL600|METRIC');
  const wrong = lookupComponentExact('FLG900 10 BLIND', assets, { filters: { componentType: 'FLANGE', subtype: 'BLIND', nps: '10', classRating: '900' } });
  assert.equal(wrong.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
