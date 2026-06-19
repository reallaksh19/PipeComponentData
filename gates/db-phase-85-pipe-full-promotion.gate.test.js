import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';
import { lookupPipeScheduleRecord } from '../src/db/pipeScheduleCatalog.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const pipes = readJson('data/normalized/pipes.json');
const pipeIndex = readJson('data/indexes/pipe.index.json');
const searchIndex = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const dataset = { ...pipes, index: pipeIndex };
const assets = { searchIndex, aliases, catalogs: { 'data/normalized/pipes.json': pipes } };

test('DB Phase 85: pipe 100% promotion rows are source-backed and complete', () => {
  assert.equal(pipes.schema, 'pipedata-normalized-pipes/v1');
  assert.equal(pipes.summary.expansionPack, 'DB_PHASE_85_PIPE_100_PROMOTION');
  assert.equal(pipes.rows.length, 489);

  const schedules = new Set(pipes.rows.map(row => row.schedule));
  const expectedSchedules = ['STD', '5', '5S', '10', '10S', '20', '30', '40', '40S', '60', '80', '80S', '100', '120', '140', '160', 'XS', 'XXS'];
  for (const s of expectedSchedules) {
    assert.ok(schedules.has(s), `Schedule ${s} missing from pipes.json`);
  }
});

test('DB Phase 85: pipe exact lookup works and negative fixtures match', () => {
  // Positive lookup: lookupPipeScheduleRecord
  const hit1 = lookupPipeScheduleRecord(dataset, { nps: '4', schedule: '40' });
  assert.equal(hit1.ok, true);
  assert.equal(hit1.row.odMm, 114.3);
  assert.equal(hit1.row.wallMm, 6.02);

  // Positive lookup: lookupComponentExact
  const hit2 = lookupComponentExact('PIPE 4 SCH40', assets, { filters: { componentType: 'PIPE', nps: '4', schedule: '40' } });
  assert.equal(hit2.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit2.row.id, 'PIPE|NPS4|SCH40');

  // Negative fixture 1: Imperial size or non-existent schedule is miss
  const miss1 = lookupPipeScheduleRecord(dataset, { nps: '4', schedule: '1600' });
  assert.equal(miss1.ok, false);

  // Negative fixture 2: Exact lookup miss for wrong schedule
  const miss2 = lookupComponentExact('PIPE 4 SCH1600', assets, { filters: { componentType: 'PIPE', nps: '4', schedule: '1600' } });
  assert.equal(miss2.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
