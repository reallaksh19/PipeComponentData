import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const reducers = readJson('data/normalized/reducers-expanded.json');
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((a) => a.kind === 'NORMALIZED_DATA').map((a) => [a.path, readJson(a.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };

test('DB Phase 70: expanded reducers are source-backed', () => {
  assert.equal(reducers.schema, 'pipedata-normalized-reducers/v1');
  assert.equal(reducers.summary.expansionPack, 'DB_PHASE_70_REDUCER_MULTI_SCHEDULE_EXPANSION');
  assert.equal(reducers.summary.generationMode, 'SOURCE_BACKED_MULTI_SCHEDULE_EXPANSION');
  assert.ok(reducers.rows.length >= 150);

  const schedules = new Set(reducers.rows.map(row => row.largeSchedule));
  for (const s of ['40', 'STD', 'XS', 'XXS']) {
    assert.ok(schedules.has(s), `Schedule ${s} missing from reducers-expanded`);
  }
});

test('DB Phase 70: promoted schedules match source values', () => {
  const con64 = reducers.rows.find((r) => r.id === 'REDUCER|CONCENTRIC|NPS6|NPS4|SCH40');
  assert.ok(con64, 'REDUCER|CONCENTRIC|NPS6|NPS4|SCH40 should exist');
  assert.equal(con64.dimensions.overallLengthMm.value, 140);
  assert.equal(con64.weights.weightKg.value, 3.9);

  for (const row of reducers.rows) {
    assert.ok(!Object.values(row.dimensions.largeEndOdMm).includes('FABRICATED'));
    assert.ok(!Object.values(row.provenance).includes('FABRICATED'));
  }
});

test('DB Phase 70: exact lookup resolves expanded reducers', () => {
  const found = lookupComponentExact('REDUCER 6 4 SCH40', assets, {
    filters: {
      componentType: 'REDUCER',
      reducerType: 'CONCENTRIC',
      largeNps: '6',
      smallNps: '4',
      largeSchedule: '40',
      smallSchedule: '40'
    }
  });
  assert.equal(found.status, LOOKUP_STATUS.FOUND);
  assert.equal(found.row.id, 'REDUCER|CONCENTRIC|NPS6|NPS4|SCH40');

  const wrong = lookupComponentExact('REDUCER 6 4 SCH20', assets, {
    filters: {
      componentType: 'REDUCER',
      reducerType: 'CONCENTRIC',
      largeNps: '6',
      smallNps: '4',
      largeSchedule: '20',
      smallSchedule: '20'
    }
  });
  assert.equal(wrong.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 70: all expanded reducers are in search index', () => {
  const reducerEntries = index.entries.filter(e => e.source === 'data/normalized/reducers-expanded.json');
  assert.equal(reducerEntries.length, reducers.rows.length);
});
