import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const pipes = readJson('data/normalized/pipes-expanded.json');
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((a) => a.kind === 'NORMALIZED_DATA').map((a) => [a.path, readJson(a.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };

test('DB Phase 69: expanded pipe schedules are source-backed', () => {
  assert.equal(pipes.schema, 'pipedata-normalized-pipes/v1');
  assert.equal(pipes.summary.expansionPack, 'DB_PHASE_69_PIPE_MULTI_SCHEDULE_EXPANSION');
  assert.equal(pipes.summary.generationMode, 'SOURCE_BACKED_MULTI_SCHEDULE_EXPANSION');
  assert.ok(pipes.rows.length >= 120);

  const schedules = new Set(pipes.rows.map(row => row.schedule));
  const expectedSchedules = ['STD', '5', '5S', '10', '10S', '20', '30', '40S', '60', '80S', '100', '120', '140', '160', 'XS', 'XXS'];
  for (const s of expectedSchedules) {
    assert.ok(schedules.has(s), `Schedule ${s} missing from pipes-expanded`);
  }
});

test('DB Phase 69: promoted schedules match source values', () => {
  const std8 = pipes.rows.find(row => row.id === 'PIPE|NPS8|SCHSTD');
  assert.ok(std8, 'PIPE|NPS8|SCHSTD should exist');
  assert.equal(std8.odMm, 219.1);
  assert.equal(std8.wallMm, 8.18);

  for (const row of pipes.rows) {
    assert.ok(!Object.values(row.valueBasis).includes('FABRICATED'));
  }
});

test('DB Phase 69: exact lookup resolves expanded pipes', () => {
  const found = lookupComponentExact('PIPE 6 STD', assets, { filters: { componentType: 'PIPE', nps: '6', schedule: 'STD' } });
  assert.equal(found.status, LOOKUP_STATUS.FOUND);
  assert.equal(found.row.id, 'PIPE|NPS6|SCHSTD');

  const wrong = lookupComponentExact('PIPE 6 SCH1600', assets, { filters: { componentType: 'PIPE', nps: '6', schedule: '1600' } });
  assert.equal(wrong.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 69: all expanded pipes are in search index', () => {
  const pipeEntries = index.entries.filter(e => e.source === 'data/normalized/pipes-expanded.json');
  assert.equal(pipeEntries.length, pipes.rows.length);
});
