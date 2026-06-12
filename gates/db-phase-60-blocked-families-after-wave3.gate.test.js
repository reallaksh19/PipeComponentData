import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((artifact) => artifact.kind === 'NORMALIZED_DATA').map((artifact) => [artifact.path, readJson(artifact.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };
const rowStatus = (row) => row?.dataStatus ?? row?.provenance?.dataStatus ?? null;

test('DB Phase 60: reducer and olet remain unindexed after wave 5', () => {
  assert.equal(index.entries.some((entry) => entry.family === 'REDUCER'), false);
  assert.equal(index.entries.some((entry) => entry.family === 'OLET'), false);
  assert.equal(manifest.artifacts.some((artifact) => /reducer|olet/i.test(artifact.path)), false);
});

test('DB Phase 60: gasket and support remain non-promoted families', () => {
  const gasket = catalogs['data/normalized/gaskets.json'].rows.find((row) => row.id === 'GASKET|RTJ|UNKNOWN|UNKNOWN|RTJ');
  const support = catalogs['data/normalized/supports.json'].rows.find((row) => row.id === 'SUPPORT|SHOE');
  assert.equal(rowStatus(gasket), 'MISSING_DIMENSION');
  assert.equal(rowStatus(support), 'PROJECT_OVERRIDE');
});

test('DB Phase 60: exact lookup still blocks reducer and nearest class fallback', () => {
  const reducer = lookupComponentExact('REDUCER 10 8 SCH80', assets, { filters: { componentType: 'REDUCER', nps: '10' } });
  assert.equal(reducer.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  const class900 = lookupComponentExact('WN FLANGE 10 CL900', assets, { filters: { componentType: 'FLANGE', subtype: 'WN', nps: '10', classRating: '900' } });
  assert.equal(class900.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
