import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { assertUniversalInvariants, fromCsv, fromUxmlXml, toUxmlXml } from '../src/index.js';

const CSV_PATH = 'fixtures/golden/phase03-seven-row.csv';

test('graph to UXML XML to graph is leaf-stable and deep-equal', async () => {
  const csv = await readFile(CSV_PATH, 'utf8');
  const graph = fromCsv(csv, { now: '2026-01-01T00:00:00.000Z' });
  const xml = toUxmlXml(graph);
  const restored = fromUxmlXml(xml, { now: '2026-01-01T00:00:00.000Z' });
  assert.equal(leafCount(restored), leafCount(graph));
  assert.deepEqual(restored, graph);
  assertUniversalInvariants(restored, { inputCount: 7 });
});

test('XML escaping fuzz survives round-trip', async () => {
  const csv = await readFile(CSV_PATH, 'utf8');
  const graph = fromCsv(csv, { now: '2026-01-01T00:00:00.000Z' });
  graph.header.notes = '<tag attr="x">& \'quoted\'';
  graph.components[0].name = 'A < B & C "quoted" \'apos\'';
  const restored = fromUxmlXml(toUxmlXml(graph));
  assert.equal(restored.header.notes, graph.header.notes);
  assert.equal(restored.components[0].name, graph.components[0].name);
});

test('same UXML imported twice can be namespaced without ID collisions', async () => {
  const csv = await readFile(CSV_PATH, 'utf8');
  const xml = toUxmlXml(fromCsv(csv, { now: '2026-01-01T00:00:00.000Z' }));
  const first = fromUxmlXml(xml, { idNamespace: 'A' });
  const second = fromUxmlXml(xml, { idNamespace: 'B' });
  const ids = [...first.components, ...second.components].map((item) => item.id);
  assert.equal(ids.length, 14);
  assert.equal(new Set(ids).size, 14);
  assert.ok(ids.every((id) => id.startsWith('A:') || id.startsWith('B:')));
});

function leafCount(value) {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + leafCount(item), 0);
  if (value && typeof value === 'object') {
    return Object.values(value).reduce((sum, item) => sum + leafCount(item), 0);
  }
  return 1;
}
