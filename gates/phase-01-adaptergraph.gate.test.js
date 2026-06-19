import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdapterGraph, ADAPTER_GRAPH_KEYS } from '../src/index.js';
import { assertUniversalInvariants } from '../src/index.js';
import { readJson } from './utils/readJson.js';

test('createAdapterGraph returns exact top-level key set', async () => {
  const expected = await readJson('contracts/adaptergraph-keys.json');
  const graph = createAdapterGraph({ now: '2026-01-01T00:00:00.000Z' });
  assert.deepEqual(Object.keys(graph).sort(), expected.sort());
  assert.deepEqual(Object.keys(graph).sort(), [...ADAPTER_GRAPH_KEYS].sort());
  assert.equal(Object.hasOwn(graph, 'now'), false);
});

test('createAdapterGraph is JSON serializable and invariant-safe', () => {
  const graph = createAdapterGraph({ now: '2026-01-01T00:00:00.000Z' });
  assertUniversalInvariants(graph);
});

test('createAdapterGraph rejects unknown top-level overrides', () => {
  assert.throws(() => createAdapterGraph({ now: 'x', junk: true }), /Unknown AdapterGraph/);
});

test('lossContract is an array', () => {
  const graph = createAdapterGraph({ now: '2026-01-01T00:00:00.000Z' });
  assert.ok(Array.isArray(graph.lossContract));
});
