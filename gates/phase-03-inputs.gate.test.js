import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { classifyComponent, fromCsv, fromRawText, fromUxmlXml, assertUniversalInvariants } from '../src/index.js';
import { readJson } from './utils/readJson.js';

const NOW = '2026-01-01T00:00:00.000Z';

test('golden seven-row CSV builds exact Phase 3 graph counts', async () => {
  const csv = await readFile('fixtures/golden/phase03-seven-row.csv', 'utf8');
  const graph = fromCsv(csv, { now: NOW });
  assertUniversalInvariants(graph);
  assert.equal(graph.components.length, 7);
  assert.equal(graph.anchors.length, 14);
  assert.equal(graph.ports.length, 13);
  assert.equal(graph.segments.length, 7);
  assert.equal(graph.supports.length, 2);
});

test('classification corpus is exact with no UNKNOWN promoted to PIPE', async () => {
  const cases = await readJson('fixtures/golden/classification-corpus.json');
  assert.equal(cases.length, 50);
  for (const item of cases) {
    const actual = classifyComponent({ raw: item.text });
    assert.equal(actual, item.expected, item.text);
    if (item.expected === 'UNKNOWN') assert.notEqual(actual, 'PIPE');
  }
});

test('malformed CSV does not throw and emits expected diagnostics', async () => {
  const csv = await readFile('fixtures/negative/malformed-csv.csv', 'utf8');
  const graph = fromCsv(csv, { now: NOW });
  assert.equal(graph.components.length, 1);
  assert.ok(graph.diagnostics.some((d) => d.code === 'CSV_ROW_MISSING_TYPE_HINT'));
  assert.ok(graph.components[0].diagnostics.some((d) => d.code === 'UNKNOWN_COMPONENT_TYPE'));
});

test('raw text creates adapter graph without CSV dependency', () => {
  const graph = fromRawText('PIPE,NPS=4,SCHEDULE=40,1X=0,1Y=0,1Z=0,2X=100,2Y=0,2Z=0', { now: NOW });
  assertUniversalInvariants(graph);
  assert.equal(graph.components.length, 1);
  assert.equal(graph.components[0].type, 'PIPE');
  assert.equal(graph.anchors.length, 2);
});

test('minimal UXML input creates AdapterGraph shell and component placeholder', async () => {
  const xml = await readFile('fixtures/golden/minimal.uxml.xml', 'utf8');
  const graph = fromUxmlXml(xml, { now: NOW });
  assertUniversalInvariants(graph);
  assert.equal(graph.schemaVersion, 'uxml-topology-v1');
  assert.equal(graph.profile, 'UXML-TOPOLOGY-FULL');
  assert.equal(graph.header.projectId, 'PRJ');
  assert.equal(graph.components.length, 1);
  assert.equal(graph.components[0].name, 'Pipe & One');
});
