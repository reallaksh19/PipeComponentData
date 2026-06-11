import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { fromCsv, enrichWithPipeData, toSolid3dSpecs } from '../src/index.js';
import { assertNoInvalidSpecNumbers } from '../src/solid3d/toSolid3dSpecs.js';

function solidPayload() {
  const csv = fs.readFileSync('fixtures/golden/phase03-seven-row.csv', 'utf8');
  return toSolid3dSpecs(enrichWithPipeData(fromCsv(csv)));
}

test('Phase 10: Solid3D specs contain no invalid numeric leaves', () => {
  assert.doesNotThrow(() => assertNoInvalidSpecNumbers(solidPayload()));
});

test('Phase 10: flange bounding dimensions match PipeData', () => {
  const payload = solidPayload();
  const flange = payload.specs.find((spec) => spec.id === 'FL1');
  assert.ok(flange);
  assert.equal(flange.solidType, 'flange');
  assert.ok(Math.abs(flange.dimensions.outerDiameterMm - 255) <= 2.55);
  assert.ok(Math.abs(flange.dimensions.axialLengthMm - 114.2) <= 1.2);
});

test('Phase 10: supported components are not placeholders and budgeted', () => {
  const payload = solidPayload();
  assert.equal(payload.summary.componentCount, 7);
  assert.equal(payload.summary.placeholderCount, 0);
  for (const spec of payload.specs) assert.ok(spec.triangleBudget <= 5000);
});
