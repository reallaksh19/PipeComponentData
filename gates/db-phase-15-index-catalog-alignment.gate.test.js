import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { componentSearch, SEARCH_MODE } from '../src/db/componentSearch.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const manifest = readJson('data/exports/db-export-manifest.json');
const searchIndex = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json').rows;
const catalogs = Object.fromEntries(
  manifest.artifacts
    .filter((artifact) => artifact.kind === 'NORMALIZED_DATA')
    .map((artifact) => [artifact.path, readJson(artifact.path)]),
);

test('DB Phase 15: every search-index entry resolves to its normalized catalog row', () => {
  const missing = [];
  for (const entry of searchIndex.entries) {
    const rows = catalogs[entry.source]?.rows ?? [];
    if (!rows.some((row) => row.id === entry.id)) missing.push(entry.id);
  }
  assert.deepEqual(missing, []);
  assert.equal(searchIndex.entries.length, 97);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'PIPE').length, 18);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'FLANGE').length, 54);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'VALVE').length, 8);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'FITTING').length, 15);
});

test('DB Phase 15: current index keeps exact IDs aligned by family', () => {
  const ids = new Set(searchIndex.entries.map((entry) => entry.id));
  for (const expected of [
    'PIPE|NPS8|SCH80',
    'PIPE|NPS12|SCH80',
    'PIPE|NPS18|SCH80',
    'PIPE|NPS20|SCH80',
    'PIPE|NPS24|SCH80',
    'FLANGE|WN|NPS4|CL600|METRIC',
    'FLANGE|BLIND|NPS6|CL600|METRIC',
    'FLANGE|WN|NPS10|CL600|METRIC',
    'FLANGE|WN|NPS12|CL600|METRIC',
    'FLANGE|BLIND|NPS22|CL600|METRIC',
    'VALVE|GATE|FLANGED|NPS4|CL1500|RF',
    'FITTING|ELBOW_90|NPS4|SCH80|METRIC',
    'GASKET|RTJ|UNKNOWN|UNKNOWN|RTJ',
    'SUPPORT|SHOE',
  ]) assert.equal(ids.has(expected), true, `${expected} missing`);
});

test('DB Phase 15: gasket inventory search does not imply unavailable size or class coverage', () => {
  const concrete = componentSearch('rtj gasket 4 300', searchIndex, {
    aliases,
    mode: SEARCH_MODE.EXACT_ALIAS_ONLY,
    filters: { componentType: 'GASKET', subtype: 'RTJ', facing: 'RTJ', nps: '4', classRating: '300' },
  });
  assert.equal(concrete.ok, false);
  assert.equal(concrete.diagnostics[0].code, 'SEARCH_NO_EXACT_MATCH');

  const inventory = componentSearch('rtj gasket', searchIndex, {
    aliases,
    mode: SEARCH_MODE.EXACT_ALIAS_ONLY,
    filters: { componentType: 'GASKET', subtype: 'RTJ', facing: 'RTJ' },
  });
  assert.equal(inventory.ok, true);
  assert.equal(inventory.results[0].id, 'GASKET|RTJ|UNKNOWN|UNKNOWN|RTJ');
  assert.equal(inventory.results[0].entry.dataStatus, 'MISSING_DIMENSION');
});

test('DB Phase 15: gate stays under accepted 300-line limit', () => {
  const lines = fs.readFileSync('gates/db-phase-15-index-catalog-alignment.gate.test.js', 'utf8').trimEnd().split('\n').length;
  assert.ok(lines <= 300, `DB Phase 15 gate has ${lines} lines`);
});
