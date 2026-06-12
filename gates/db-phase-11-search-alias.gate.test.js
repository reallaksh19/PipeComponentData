import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { componentSearch, expandQueryAliases, SEARCH_MODE } from '../src/db/componentSearch.js';

const index = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));
const aliases = JSON.parse(fs.readFileSync('data/search/component-aliases.json', 'utf8')).rows;

test('DB Phase 11: alias expansion supports discipline terms', () => {
  const terms = expandQueryAliases('welding neck flange 4 300', aliases);
  assert.ok(terms.includes('WN'));
  assert.ok(terms.includes('FLANGE'));
});

test('DB Phase 11: exact alias search returns the intended valve row', () => {
  const result = componentSearch('gate valve 8 class 150 rf', index, {
    aliases,
    filters: { componentType: 'VALVE', classRating: '150', nps: '8' },
  });
  assert.equal(result.ok, true);
  assert.equal(result.results[0].id, 'VALVE|GATE|FLANGED|NPS8|CL150|RF');
});

test('DB Phase 11: wrong rating does not fall back to nearest component', () => {
  const result = componentSearch('gate valve 8 class 300 rf', index, {
    aliases,
    filters: { componentType: 'VALVE', classRating: '300', nps: '8' },
  });
  assert.equal(result.ok, false);
  assert.equal(result.results.length, 0);
  assert.equal(result.diagnostics[0].code, 'SEARCH_NO_EXACT_MATCH');
});

test('DB Phase 11: unsupported fuzzy modes are rejected explicitly', () => {
  const result = componentSearch('flange 4 300', index, { aliases, mode: 'FUZZY_NEAREST' });
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, 'SEARCH_MODE_NOT_ALLOWED');
  assert.equal(result.mode, 'FUZZY_NEAREST');
});

test('DB Phase 11: missing-dimension gasket result remains visible but status-tagged', () => {
  const result = componentSearch('rtj gasket 4 300', index, {
    aliases,
    filters: { componentType: 'GASKET', classRating: '300' },
  });
  assert.equal(result.ok, true);
  assert.equal(result.results[0].id, 'GASKET|RTJ|NPS4|CL300');
  assert.equal(result.results[0].entry.dataStatus, 'MISSING_DIMENSION');
});

test('DB Phase 11: search module and gate stay under 200 lines', () => {
  for (const file of ['src/db/componentSearch.js', 'gates/db-phase-11-search-alias.gate.test.js']) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= 200, `${file} has ${lines} lines`);
  }
  assert.equal(index.mode, SEARCH_MODE.EXACT_ALIAS_ONLY);
});
