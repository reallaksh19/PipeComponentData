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
  assert.equal(pipes.summary.expansionPack, 'DB_PHASE_47_PIPE_SCHEDULE_WAVE_1');
  assert.equal(pipes.summary.generationMode, 'SOURCE_BACKED_WAVE_1_EXPANSION');
  assert.equal(pipes.rows.length, 10);
  assert.equal(row('PIPE|NPS6|SCH40').source, 'Database/Pipe/PIPE40.csv');
  assert.equal(row('PIPE|NPS6|SCH40').sourceRow, 16);
  assert.equal(row('PIPE|NPS6|SCH40').wallMm, 7.11);
  assert.equal(row('PIPE|NPS2|SCH80').source, 'Database/Pipe/PIPE80.csv');
  assert.equal(row('PIPE|NPS2|SCH80').wallMm, 5.54);
  assert.equal(row('PIPE|NPS2|SCH80').weightKgPerM, 7.48);
});

test('DB Phase 47: pipe exact lookup includes wave 1 rows without fallback', () => {
  const hit = lookupComponentExact('PIPE 2 SCH80', assets, { filters: { componentType: 'PIPE', nps: '2', schedule: '80' } });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.id, 'PIPE|NPS2|SCH80');
  const miss = lookupComponentExact('PIPE 2 SCH160', assets, { filters: { componentType: 'PIPE', nps: '2', schedule: '160' } });
  assert.equal(miss.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 47: no pipe row contains fabricated value basis', () => {
  for (const item of pipes.rows) assert.ok(!Object.values(item.valueBasis ?? {}).includes('FABRICATED'));
});
