import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createWorkbenchModel } from '../src/index.js';

const csv = fs.readFileSync('fixtures/golden/phase03-seven-row.csv', 'utf8');

test('Phase 12: paste fixture shows exact component count', () => {
  const model = createWorkbenchModel(csv);
  assert.equal(model.counts.components, 7);
  assert.equal(model.labels.componentCount, '7 components');
});

test('Phase 12: workbench round-trip action reports passed', () => {
  const model = createWorkbenchModel(csv);
  assert.equal(model.actions.roundTrip().label, 'passed');
});

test('Phase 12: diagnostics count is explicit UI data', () => {
  const model = createWorkbenchModel(csv);
  assert.equal(typeof model.counts.diagnostics, 'number');
  assert.match(model.labels.diagnosticCount, /^\d+ diagnostics$/);
});
