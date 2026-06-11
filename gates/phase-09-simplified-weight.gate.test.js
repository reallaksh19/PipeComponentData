import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fromCsv, enrichWithPipeData, resolveConnectivity, toCanonicalGeometry } from '../src/index.js';

const weightFixture = 'fixtures/golden/phase09-weight-line.csv';
const elbowFixture = 'fixtures/golden/phase09-elbow-lr90.csv';

test('phase 9 hand-calculated pipe, fill, valve and reaction benchmark', async () => {
  const geometry = await geometryFromCsv(weightFixture);
  const pipe = byComponent(geometry, 'P-4SCH40');
  const valve = byComponent(geometry, 'V-GATE-8');

  approx(pipe.length_mm, 10000, 1e-9);
  approx(pipe.metalMass_kg, 160.7, 0.05);
  approx(pipe.contentsMass_kg, 82.1, 0.2);
  assert.equal(valve.component.componentWeight_kg, 144);

  const reactionSum = geometry.supports.reduce((sum, support) => sum + support.reaction_N, 0);
  const ratio = Math.abs(reactionSum - geometry.totals.weight_N) / geometry.totals.weight_N;
  assert.ok(ratio <= 0.001, `support reactions do not balance weight: ${ratio}`);
});

test('phase 9 bend chord uses developed arc length for mass geometry', async () => {
  const geometry = await geometryFromCsv(elbowFixture);
  const elbow = byComponent(geometry, 'E-4-LR90');

  approx(elbow.length_mm, 239.39, 2.4);
  assert.ok(Math.abs(elbow.length_mm - 215.52) > 10, 'elbow length silently used chord length');
});

test('phase 9 canonical geometry is Simplified-compatible', async () => {
  const geometry = await geometryFromCsv(weightFixture);
  assert.equal(geometry.schema, 'simplified-canonical-geometry/v1');
  assert.ok(geometry.segments.every((segment) => Number.isFinite(segment.length_mm)));
  assert.ok(geometry.segments.every((segment) => segment.pipe && segment.contents && segment.component));
  assert.equal(geometry.supports.length, 2);
});

async function geometryFromCsv(path) {
  const csv = await readFile(path, 'utf8');
  const graph = resolveConnectivity(enrichWithPipeData(fromCsv(csv)), { toleranceMm: 1 });
  return toCanonicalGeometry(graph, { fluidDensityKgM3: 1000, gravityM_S2: 9.80665 });
}

function byComponent(geometry, componentId) {
  const segment = geometry.segments.find((item) => item.componentId === componentId);
  assert.ok(segment, `missing segment for ${componentId}`);
  return segment;
}

function approx(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} not within ${tolerance} of ${expected}`);
}
