import assert from 'node:assert/strict';
import test from 'node:test';
import { createPipeDataDb, enrichWithPipeData, fromCsv } from '../src/index.js';
import { assertUniversalInvariants } from '../src/validate/assertUniversalInvariants.js';

const csv = `id,type,subtype,nps,schedule,class,face,endtype,1x,1y,1z,2x,2y,2z,x,y,z
P1,PIPE,,4,40,,,,0,0,0,1000,0,0,,,
FL1,FLANGE,WN,4,,300,RF,FLANGED,1000,0,0,1084,0,0,,,
V1,VALVE,GATE,8,,150,RF,FLANGED,2000,0,0,2292,0,0,,,
VSK,VALVE,GATE,8,,150,BW,BW,2400,0,0,2500,0,0,,,
E1,ELBOW,ELBOW_90_LR,4,40,,,,3000,0,0,3150,150,0,,,
S1,SUPPORT,SHOE,8,,,,,,,,,,,2500,0,-150
`;

function enrichedGraph() {
  return enrichWithPipeData(fromCsv(csv, { now: '2026-01-01T00:00:00.000Z' }), createPipeDataDb());
}

function component(graph, id) {
  return graph.components.find((item) => item.id === id);
}

test('phase 5 enrichment preserves AdapterGraph invariants', () => {
  assertUniversalInvariants(enrichedGraph());
});

test('published DB values enrich graph dimensions exactly', () => {
  const graph = enrichedGraph();
  assert.equal(component(graph, 'P1').derived.dimensions.odMm, 114.3);
  assert.equal(component(graph, 'P1').derived.dimensions.wallMm, 6.02);
  assert.equal(component(graph, 'P1').derived.dimensions.weightKgPerM, 16.07);
  assert.equal(component(graph, 'FL1').derived.dimensions.flangeOdMm, 255);
  assert.equal(component(graph, 'FL1').derived.dimensions.flangeThicknessMm, 30.2);
  assert.equal(component(graph, 'V1').derived.dimensions.faceToFaceMm, 292);
  assert.equal(component(graph, 'E1').derived.dimensions.developedLengthMm, 239.39);
  assert.equal(component(graph, 'S1').derived.dimensions.shoeHeightMm, 150);
});

test('WN weld diameter is not treated as bore', () => {
  const flange = component(enrichedGraph(), 'FL1');
  assert.equal(flange.derived.dimensions.weldDiaMm, 114.3);
  assert.equal(Object.hasOwn(flange.derived.dimensions, 'boreMm'), false);
  assert.notEqual(flange.bore, flange.derived.dimensions.weldDiaMm);
});

test('sketch-only valve does not fabricate face-to-face length', () => {
  const valve = component(enrichedGraph(), 'VSK');
  assert.equal(valve.derived.dimensions?.faceToFaceMm, undefined);
  assert.ok(valve.diagnostics.some((d) => d.code.startsWith('VALVE_SKETCH_ONLY')));
});

test('every numeric enriched dimension carries provenance', () => {
  const graph = enrichedGraph();
  for (const item of graph.components) {
    const dimensions = item.derived?.dimensions || {};
    const provenance = item.derived?.dimensionProvenance || {};
    for (const [key, value] of Object.entries(dimensions)) {
      if (typeof value === 'number') {
        assert.ok(provenance[key], `${item.id}.${key} has no provenance`);
        assert.ok(provenance[key].source, `${item.id}.${key} has no source`);
        assert.ok(provenance[key].datasetVersion, `${item.id}.${key} has no datasetVersion`);
      }
    }
  }
});
