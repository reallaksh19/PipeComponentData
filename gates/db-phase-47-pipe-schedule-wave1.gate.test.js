import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const pipes = readJson('data/normalized/pipes.json');
const assets = {
  searchIndex: readJson('data/indexes/component-search.index.json'),
  aliases: readJson('data/search/component-aliases.json'),
  catalogs: { 'data/normalized/pipes.json': pipes },
};
const row = (id) => pipes.rows.find((item) => item.id === id);

test('DB Phase 47: pipe Schedule 40 and 80 wave 1 rows are source-backed', () => {
  assert.equal(pipes.summary.expansionPack, 'DB_PHASE_85_PIPE_100_PROMOTION');
  assert.equal(pipes.summary.generationMode, 'SOURCE_BACKED_PROMOTION');
  assert.equal(pipes.rows.length, 489);
  const r6 = row('PIPE|NPS6|SCH40');
  assert.equal(r6.source, 'Database/Pipe/PIPE40.csv');
  assert.equal(r6.sourceRow, 16);
  assert.equal(r6.wallMm, 7.11);
  const r2 = row('PIPE|NPS2|SCH80');
  assert.equal(r2.source, 'Database/Pipe/PIPE80.csv');
  assert.equal(r2.wallMm, 5.54);
  assert.equal(r2.weightKgPerM, 7.48);
});

test('DB Phase 47: pipe exact lookup includes wave 1 rows without fallback', () => {
  const hit = lookupComponentExact('PIPE 2 SCH80', assets, { filters: { componentType: 'PIPE', nps: '2', schedule: '80' } });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'PIPE|NPS2|SCH80');
  const miss = lookupComponentExact('PIPE 2 SCH1600', assets, { filters: { componentType: 'PIPE', nps: '2', schedule: '1600' } });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 47: no pipe row contains fabricated value basis', () => {
  for (const item of pipes.rows) assert.ok(!Object.values(item.valueBasis ?? {}).includes('FABRICATED'));
});
