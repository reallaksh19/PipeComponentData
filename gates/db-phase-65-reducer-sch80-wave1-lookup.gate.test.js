import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((artifact) => artifact.kind === 'NORMALIZED_DATA').map((artifact) => [artifact.path, readJson(artifact.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };

test('DB Phase 65: exact lookup resolves a promoted schedule 80 reducer row', () => {
  const found = lookupComponentExact('REDUCER 2 1+1/2 SCH80', assets, {
    filters: {
      componentType: 'REDUCER',
      reducerType: 'UNKNOWN',
      largeNps: '2',
      smallNps: '1+1/2',
      largeSchedule: '80',
      smallSchedule: '80',
    },
  });
  assert.equal(found.status, LOOKUP_STATUS.FOUND);
  assert.equal(found.row.id, 'REDUCER|UNKNOWN|NPS2|NPS1+1/2|SCH80');
  assert.equal(found.row.source, 'docs/Pipedata/Database/Ftbw/Reducers80.csv');
  assert.equal(found.row.weights.weightKg.value, 0.57);
});

test('DB Phase 65: wrong reducer schedule, type, or family returns no exact match', () => {
  const wrongSchedule = lookupComponentExact('REDUCER 2 1+1/2 SCH40', assets, {
    filters: {
      componentType: 'REDUCER',
      reducerType: 'UNKNOWN',
      largeNps: '2',
      smallNps: '1+1/2',
      largeSchedule: '40',
      smallSchedule: '40',
    },
  });
  assert.equal(wrongSchedule.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  const wrongType = lookupComponentExact('REDUCER 2 1+1/2 SCH80', assets, {
    filters: {
      componentType: 'REDUCER',
      reducerType: 'CONCENTRIC',
      largeNps: '2',
      smallNps: '1+1/2',
      largeSchedule: '80',
      smallSchedule: '80',
    },
  });
  assert.equal(wrongType.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  const wrongFamily = lookupComponentExact('PIPE 2 1+1/2 SCH80', assets, {
    filters: {
      componentType: 'PIPE',
      reducerType: 'UNKNOWN',
      largeNps: '2',
      smallNps: '1+1/2',
      largeSchedule: '80',
      smallSchedule: '80',
    },
  });
  assert.equal(wrongFamily.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 65: reducer lookup gate stays under accepted line limit', () => {
  const lines = fs.readFileSync('gates/db-phase-65-reducer-sch80-wave1-lookup.gate.test.js', 'utf8').trimEnd().split('\n').length;
  assert.ok(lines <= 220, `gates/db-phase-65-reducer-sch80-wave1-lookup.gate.test.js has ${lines} lines`);
});
