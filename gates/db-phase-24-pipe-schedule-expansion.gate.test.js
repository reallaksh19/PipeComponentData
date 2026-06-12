import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const pipes = readJson('data/normalized/pipes.json');
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const catalogs = {
  'data/normalized/pipes.json': pipes,
  'data/normalized/flanges.json': readJson('data/normalized/flanges.json'),
  'data/normalized/valves.json': readJson('data/normalized/valves.json'),
  'data/normalized/fittings.json': readJson('data/normalized/fittings.json'),
  'data/normalized/gaskets.json': readJson('data/normalized/gaskets.json'),
  'data/normalized/supports.json': readJson('data/normalized/supports.json'),
};
const assets = { searchIndex: index, aliases, catalogs };

function row(id) {
  return pipes.rows.find((item) => item.id === id);
}

test('DB Phase 24: pipe schedule sample expansion is source-backed', () => {
  assert.equal(pipes.summary.generationMode, 'SOURCE_BACKED_SAMPLE_EXPANSION');
  assert.equal(pipes.summary.sampledRowCount, 5);
  assert.equal(pipes.summary.expansionPack, 'DB_PHASE_24_PIPE_SCHEDULE_SAMPLE');
  assert.equal(pipes.rows.length, 5);
  assert.equal(row('PIPE|NPS0+1/4|SCH40').sourceRow, 3);
  assert.equal(row('PIPE|NPS1|SCH40').sourceRow, 7);
  assert.equal(row('PIPE|NPS2|SCH40').sourceRow, 10);
});

test('DB Phase 24: promoted pipe values match committed PIPE40 source rows', () => {
  const nps2 = row('PIPE|NPS2|SCH40');
  assert.equal(nps2.odMm, 60.3);
  assert.equal(nps2.wallMm, 3.91);
  assert.equal(nps2.idMm, 52.48);
  assert.equal(nps2.weightKgPerM, 5.44);
  assert.equal(nps2.valueBasis.odMm, 'SOURCE_VALUE');
  assert.equal(row('PIPE|NPS0+1/8|SCH40').dataStatus, 'PARTIAL');
  assert.equal(row('PIPE|NPS0+1/8|SCH40').valueBasis.odMm, 'UNAVAILABLE');
});

test('DB Phase 24: exact pipe lookup works and wrong schedule does not fallback', () => {
  const found = lookupComponentExact('PIPE 2 SCH40', assets, {
    filters: { componentType: 'PIPE', nps: '2', schedule: '40' },
  });
  assert.equal(found.status, LOOKUP_STATUS.FOUND);
  assert.equal(found.row.id, 'PIPE|NPS2|SCH40');

  const wrong = lookupComponentExact('PIPE 2 SCH80', assets, {
    filters: { componentType: 'PIPE', nps: '2', schedule: '80' },
  });
  assert.equal(wrong.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 24: promoted pipe rows are indexed and non-fabricated', () => {
  const indexed = new Set(index.entries.filter((entry) => entry.family === 'PIPE').map((entry) => entry.id));
  for (const promoted of ['PIPE|NPS0+1/4|SCH40', 'PIPE|NPS1|SCH40', 'PIPE|NPS2|SCH40', 'PIPE|NPS4|SCH40']) {
    assert.equal(indexed.has(promoted), true, `${promoted} missing from index`);
    assert.ok(!Object.values(row(promoted).valueBasis).includes('FABRICATED'));
  }
});
