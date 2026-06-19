import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const manifest = readJson('data/exports/db-export-manifest.json');
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const ledger = readJson('data/audit/source-expansion-ledger.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((artifact) => artifact.kind === 'NORMALIZED_DATA').map((artifact) => [artifact.path, readJson(artifact.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };
const rowStatus = (row) => row?.dataStatus ?? row?.provenance?.dataStatus ?? null;

test('DB Phase 66: reducer is promoted while olet remains blocked', () => {
  const hasOlets = fs.existsSync('data/normalized/olets-weldolet.json');
  assert.equal(index.entries.some((entry) => entry.family === 'REDUCER'), true);
  assert.equal(index.entries.some((entry) => entry.family === 'OLET'), hasOlets);
  assert.equal(manifest.artifacts.some((artifact) => /reducers-sch80-wave1\.json$/i.test(artifact.path)), true);
  assert.equal(manifest.artifacts.some((artifact) => /olets\.json$/i.test(artifact.path)), false);
  assert.equal(ledger.families.REDUCER.status, 'READY_FOR_PROMOTION');
  assert.equal(ledger.families.OLET.status, hasOlets ? 'READY_FOR_PROMOTION' : 'BLOCKED_SOURCE_MISSING');
});

test('DB Phase 66: exact lookup still rejects unpromoted families', () => {
  const olet = lookupComponentExact('OLET 2 2', assets, { filters: { componentType: 'OLET', subtype: 'BRANCH_OLET' } });
  assert.equal(olet.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  const wrongFamily = lookupComponentExact('PIPE 2 1+1/2 SCH80', assets, {
    filters: {
      componentType: 'PIPE',
      reducerType: 'UNKNOWN',
      largeNps: '2',
      smallNps: '1+1/2',
      largeSchedule: '80',
      smallSchedule: '80',
    },
  });
  assert.equal(wrongFamily.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  const gasket = catalogs['data/normalized/gaskets.json'].rows.find((row) => row.id === 'GASKET|RTJ|UNKNOWN|UNKNOWN|RTJ');
  const support = catalogs['data/normalized/supports.json'].rows.find((row) => row.id === 'SUPPORT|SHOE');
  assert.equal(rowStatus(gasket), 'MISSING_DIMENSION');
  assert.equal(rowStatus(support), 'PROJECT_OVERRIDE');
});

test('DB Phase 66: blocked-family gate stays under accepted line limit', () => {
  const lines = fs.readFileSync('gates/db-phase-66-blocked-families.gate.test.js', 'utf8').trimEnd().split('\n').length;
  assert.ok(lines <= 220, `gates/db-phase-66-blocked-families.gate.test.js has ${lines} lines`);
});
