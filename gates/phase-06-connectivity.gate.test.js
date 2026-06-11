import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertUniversalInvariants, fromCsv, resolveConnectivity } from '../src/index.js';

const here = new URL('.', import.meta.url);
const golden = readFileSync(new URL('../fixtures/golden/phase06-connectivity-line.csv', here), 'utf8');
const ambiguous = readFileSync(new URL('../fixtures/negative/phase06-ambiguous-cluster.csv', here), 'utf8');

test('golden line resolves exactly six endpoint connections', () => {
  const graph = resolveConnectivity(fromCsv(golden), { toleranceMm: 1 });
  assertUniversalInvariants(graph);
  assert.equal(graph.adapter.connectivity.connectedPairs, 6);
  assert.equal(graph.adapter.connectivity.ambiguous, 0);
  assert.equal(countConnectedPairs(graph), 6);
});

test('connection tolerance boundary is exact', () => {
  assert.equal(resolveConnectivity(fromCsv(toleranceCsv(0)), { toleranceMm: 1 }).adapter.connectivity.connectedPairs, 1);
  assert.equal(resolveConnectivity(fromCsv(toleranceCsv(0.5)), { toleranceMm: 1 }).adapter.connectivity.connectedPairs, 1);
  assert.equal(resolveConnectivity(fromCsv(toleranceCsv(0.99)), { toleranceMm: 1 }).adapter.connectivity.connectedPairs, 1);
  const open = resolveConnectivity(fromCsv(toleranceCsv(1.01)), { toleranceMm: 1 });
  assert.equal(open.adapter.connectivity.connectedPairs, 0);
  assert.ok(open.ports.some((port) => port.connectsTo === 'TERMINAL'));
});

test('ambiguous three-port cluster emits exactly one diagnostic and no connection', () => {
  const graph = resolveConnectivity(fromCsv(ambiguous), { toleranceMm: 1 });
  const ambiguousDiagnostics = graph.diagnostics.filter((item) => item.code === 'AMBIGUOUS_PORT_CLUSTER');
  assert.equal(ambiguousDiagnostics.length, 1);
  assert.equal(graph.adapter.connectivity.ambiguous, 1);
  assert.equal(graph.adapter.connectivity.connectedPairs, 0);
});

test('support attaches to nearest pipe with deterministic station', () => {
  const graph = resolveConnectivity(fromCsv(supportCsv()), { supportToleranceMm: 20 });
  const support = graph.supports.find((item) => item.id === 'S1:SUPPORT');
  assert.ok(support);
  assert.equal(support.hostCandidates.length, 1);
  assert.equal(support.hostCandidates[0].componentId, 'P1');
  assert.ok(Math.abs(support.hostCandidates[0].stationMm - 250) <= 0.1);
  assert.ok(Math.abs(support.hostCandidates[0].distanceMm - 10) <= 0.1);
});

test('resolver output is deterministic for shuffled graph sections', () => {
  const graph = fromCsv(golden);
  const shuffled = reverseSections(graph);
  assert.deepEqual(resolveConnectivity(shuffled), resolveConnectivity(graph));
});

function toleranceCsv(gapMm) {
  return `id,type,x1,y1,z1,x2,y2,z2\nP1,PIPE,0,0,0,100,0,0\nP2,PIPE,${100 + gapMm},0,0,200,0,0\n`;
}

function supportCsv() {
  return 'id,type,subtype,x1,y1,z1,x2,y2,z2,x,y,z\nP1,PIPE,,0,0,0,500,0,0,,,\nS1,SUPPORT,GUIDE,,,,,,,250,10,0\n';
}

function countConnectedPairs(graph) {
  const pairs = new Set();
  for (const port of graph.ports) {
    if (!port.connectsTo || ['ENDPOINT', 'TERMINAL'].includes(port.connectsTo)) continue;
    pairs.add([port.id, port.connectsTo].sort().join('|'));
  }
  return pairs.size;
}

function reverseSections(graph) {
  const copy = JSON.parse(JSON.stringify(graph));
  for (const section of ['components', 'anchors', 'ports', 'segments', 'supports']) {
    copy[section] = [...copy[section]].reverse();
  }
  return copy;
}
