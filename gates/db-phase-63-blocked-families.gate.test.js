import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const ledger = readJson('data/audit/source-expansion-ledger.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((artifact) => artifact.kind === 'NORMALIZED_DATA').map((artifact) => [artifact.path, readJson(artifact.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };
const rowStatus = (row) => row?.dataStatus ?? row?.provenance?.dataStatus ?? null;

test('DB Phase 63: reducer and olet stay unindexed after bounded source expansion', () => {
  assert.equal(index.entries.some((entry) => entry.family === 'REDUCER'), false);
  assert.equal(index.entries.some((entry) => entry.family === 'OLET'), false);
  assert.equal(manifest.artifacts.some((artifact) => /reducer|olet/i.test(artifact.path)), false);
  assert.equal(ledger.families.REDUCER.status, 'BLOCKED_SOURCE_MISSING');
  assert.equal(ledger.families.OLET.status, 'BLOCKED_SOURCE_MISSING');
});

test('DB Phase 63: blocked families still reject exact lookup without fallback', () => {
  const reducer = lookupComponentExact('REDUCER 10 8 SCH80', assets, { filters: { componentType: 'REDUCER', nps: '10', schedule: '80' } });
  assert.equal(reducer.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  const olet = lookupComponentExact('OLET 2 2', assets, { filters: { componentType: 'OLET', nps: '2' } });
  assert.equal(olet.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  const wrongFamily = lookupComponentExact('PIPE 10 SCH80', assets, { filters: { componentType: 'REDUCER', nps: '10', schedule: '80' } });
  assert.equal(wrongFamily.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 63: gasket and support remain in their current non-promoted states', () => {
  const gasket = catalogs['data/normalized/gaskets.json'].rows.find((row) => row.id === 'GASKET|RTJ|UNKNOWN|UNKNOWN|RTJ');
  const support = catalogs['data/normalized/supports.json'].rows.find((row) => row.id === 'SUPPORT|SHOE');
  assert.equal(rowStatus(gasket), 'MISSING_DIMENSION');
  assert.equal(rowStatus(support), 'PROJECT_OVERRIDE');
  assert.equal(ledger.families.GASKET.status, 'BLOCKED_SOURCE_MISSING');
  assert.equal(ledger.families.SUPPORT.status, 'MANUAL_REVIEW');
});

test('DB Phase 63: gate stays under accepted line limit', () => {
  const lines = fs.readFileSync('gates/db-phase-63-blocked-families.gate.test.js', 'utf8').trimEnd().split('\n').length;
  assert.ok(lines <= 220, `gates/db-phase-63-blocked-families.gate.test.js has ${lines} lines`);
});
