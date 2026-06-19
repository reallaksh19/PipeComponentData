import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const reducers = readJson('data/normalized/reducers-sch80-wave2.json');
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((a) => a.kind === 'NORMALIZED_DATA').map((a) => [a.path, readJson(a.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };

test('DB Phase 68: bounded SCH80 wave 2 reducer is source-backed', () => {
  assert.equal(reducers.schema, 'pipedata-normalized-reducers/v1');
  assert.equal(reducers.summary.expansionPack, 'DB_PHASE_68_REDUCER_SCH80_WAVE2_PROMOTION');
  assert.equal(reducers.summary.generationMode, 'SOURCE_BACKED_WAVE_2_EXPANSION');
  assert.ok(reducers.rows.length >= 30);
  assert.equal(reducers.rows.length, 97);
});

test('DB Phase 68: reducer type classification is correct', () => {
  for (const row of reducers.rows) {
    assert.ok(row.reducerType === 'CONCENTRIC' || row.reducerType === 'ECCENTRIC');
  }
});

test('DB Phase 68: promoted SCH80 source values match Reducers80 rows', () => {
  const con64 = reducers.rows.find((r) => r.id === 'REDUCER|CONCENTRIC|NPS6|NPS4|SCH80');
  assert.ok(con64, 'REDUCER|CONCENTRIC|NPS6|NPS4|SCH80 should exist');
  assert.equal(con64.dimensions.overallLengthMm.value, 140);
  assert.equal(con64.weights.weightKg.value, 5.95);

  const ecc64 = reducers.rows.find((r) => r.id === 'REDUCER|ECCENTRIC|NPS6|NPS4|SCH80');
  assert.ok(ecc64, 'REDUCER|ECCENTRIC|NPS6|NPS4|SCH80 should exist');
  assert.equal(ecc64.dimensions.overallLengthMm.value, 140);
  assert.equal(ecc64.weights.weightKg.value, 5.95);
});

test('DB Phase 68: exact lookup resolves wave 2 reducers and rejects wrong schedule', () => {
  const hit = lookupComponentExact('REDUCER 6 4 SCH80', assets, {
    filters: {
      componentType: 'REDUCER',
      reducerType: 'CONCENTRIC',
      largeNps: '6',
      smallNps: '4',
      largeSchedule: '80',
      smallSchedule: '80'
    }
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  // It matches the first one in the list or has specific resolution
  assert.ok(hit.row.id.startsWith('REDUCER|'));
  assert.ok(hit.row.id.endsWith('|NPS6|NPS4|SCH80'));

  const wrong = lookupComponentExact('REDUCER 6 4 SCH400', assets, { filters: { componentType: 'REDUCER', largeNps: '6', smallNps: '4', largeSchedule: '400' } });
  assert.equal(wrong.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 68: all wave 2 reducers are indexed in search index', () => {
  const entries = index.entries.filter(e => e.source === 'data/normalized/reducers-sch80-wave2.json');
  assert.equal(entries.length, 97);
  for (const entry of entries) {
    assert.equal(entry.family, 'REDUCER');
    assert.ok(entry.reducerType === 'CONCENTRIC' || entry.reducerType === 'ECCENTRIC');
  }
});
