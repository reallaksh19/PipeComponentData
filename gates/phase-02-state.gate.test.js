import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAdapterGraph,
  patchComponent,
  addGraphDiagnostic,
  createGraphHistory,
  commitGraph,
  undoGraph,
  createPipingGraphSlice,
} from '../src/index.js';
import { listJsFiles, readSourceFile } from './utils/sourceFiles.js';

const FORBIDDEN = ['three', 'document.', 'window.', 'DOMParser', 'localStorage', "from 'zustand'", 'from "zustand"'];

test('core source has no DOM, Three.js, localStorage, or zustand dependency', async () => {
  const hits = [];
  for (const file of await listJsFiles('src')) {
    const text = await readSourceFile(file);
    for (const token of FORBIDDEN) if (text.includes(token)) hits.push(`${file}:${token}`);
  }
  assert.deepEqual(hits, []);
});

test('patchComponent is pure and preserves untouched component identity', () => {
  const graph = makeTwoComponentGraph();
  const first = graph.components[0];
  const second = graph.components[1];
  const next = patchComponent(graph, 'C1', { normalized: { nps: '4' } });

  assert.notEqual(next, graph);
  assert.notEqual(next.components[0], first);
  assert.equal(next.components[1], second);
  assert.equal(graph.components[0].normalized.nps, undefined);
  assert.equal(next.components[0].normalized.nps, '4');
});

test('graph history performs ten commits and ten undos exactly', () => {
  const original = makeTwoComponentGraph();
  let history = createGraphHistory(original);
  let graph = original;
  for (let i = 0; i < 10; i += 1) {
    graph = addGraphDiagnostic(graph, { code: `D${i}` });
    history = commitGraph(history, graph);
  }
  for (let i = 0; i < 10; i += 1) history = undoGraph(history);
  assert.deepEqual(history.present, original);
});

test('zustand-compatible slice factory runs with app-owned set/get', () => {
  const store = makeVanillaStore(createPipingGraphSlice);
  const graph = makeTwoComponentGraph();
  store.getState().setPipingGraph(graph);
  store.getState().selectComponent('C2');
  store.getState().updateComponent('C2', { normalized: { classRating: '300' } });

  const selected = store.getState().getSelectedComponent();
  assert.equal(selected.id, 'C2');
  assert.equal(selected.normalized.classRating, '300');
  assert.equal(store.getState().exportGraph().components.length, 2);
});

function makeTwoComponentGraph() {
  return createAdapterGraph({
    now: '2026-01-01T00:00:00.000Z',
    components: [
      { id: 'C1', type: 'PIPE', normalized: {}, derived: {}, rawAttributes: {}, diagnostics: [] },
      { id: 'C2', type: 'VALVE', normalized: {}, derived: {}, rawAttributes: {}, diagnostics: [] },
    ],
  });
}

function makeVanillaStore(sliceFactory) {
  let state = {};
  const get = () => state;
  const set = (patch) => {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  };
  state = sliceFactory(set, get);
  return { getState: get, setState: set };
}
