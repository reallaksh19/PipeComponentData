import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const reducers = readJson('data/normalized/reducers.json');
const searchIndex = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const assets = { searchIndex, aliases, catalogs: { 'data/normalized/reducers.json': reducers } };

test('DB Phase 86: reducer 100% promotion rows are source-backed and complete', () => {
  assert.equal(reducers.schema, 'pipedata-normalized-reducers/v1');
  assert.equal(reducers.summary.expansionPack, 'DB_PHASE_86_REDUCER_100_PROMOTION');
  assert.equal(reducers.rows.length, 3202);

  const types = new Set(reducers.rows.map(row => row.reducerType));
  assert.ok(types.has('CONCENTRIC'));
  assert.ok(types.has('ECCENTRIC'));
});

test('DB Phase 86: reducer exact lookup works and negative fixtures match', () => {
  // Positive lookup: Concentric reducer NPS 6x4 SCH 40
  const hit1 = lookupComponentExact('REDUCER 6 4 SCH40', assets, {
    filters: {
      componentType: 'REDUCER',
      reducerType: 'CONCENTRIC',
      largeNps: '6',
      smallNps: '4',
      largeSchedule: '40',
      smallSchedule: '40'
    }
  });
  assert.equal(hit1.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit1.row.id, 'REDUCER|CONCENTRIC|NPS6|NPS4|SCH40');
  assert.equal(hit1.row.dimensions.overallLengthMm.value, 140);
  assert.equal(hit1.row.weights.weightKg.value, 3.9);

  // Positive lookup: Eccentric reducer NPS 6x4 SCH 40
  const hit2 = lookupComponentExact('REDUCER 6 4 SCH40', assets, {
    filters: {
      componentType: 'REDUCER',
      reducerType: 'ECCENTRIC',
      largeNps: '6',
      smallNps: '4',
      largeSchedule: '40',
      smallSchedule: '40'
    }
  });
  assert.equal(hit2.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit2.row.id, 'REDUCER|ECCENTRIC|NPS6|NPS4|SCH40');

  // Negative fixture 1: non-existent schedule lookup is a miss
  const miss1 = lookupComponentExact('REDUCER 6 4 SCH1600', assets, {
    filters: {
      componentType: 'REDUCER',
      reducerType: 'CONCENTRIC',
      largeNps: '6',
      smallNps: '4',
      largeSchedule: '1600',
      smallSchedule: '1600'
    }
  });
  assert.equal(miss1.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
