import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { collectTaggedValues, makeNormalizedRow } from '../src/normalize/rowEnvelope.js';
import { normalizeStagingRow } from '../src/normalize/normalizeStagingRows.js';
import { VALUE_BASIS } from '../src/normalize/valueBasis.js';

const fixtures = JSON.parse(fs.readFileSync('data/normalization-fixtures/staging-samples.json', 'utf8'));

test('DB Phase 4: pipe staging row becomes tagged normalized envelope', () => {
  const row = normalizeStagingRow(fixtures.pipe);
  assert.equal(row.id, 'PIPE|NPS4|SCH40');
  assert.equal(row.provenance.source, 'Database/Pipe/PIPE40.csv');
  assert.equal(row.dimensions.odMm.basis, VALUE_BASIS.SOURCE_VALUE);
  assert.equal(row.dimensions.odMm.value, 114.3);
  assert.equal(row.dimensions.wallMm.value, 6.02);
  assert.equal(row.dimensions.idMm.basis, VALUE_BASIS.DERIVED_VALUE);
  assert.equal(row.dimensions.idMm.value, 102.26);
  assert.equal(row.weights.weightKgPerM.value, 16.07);
});

test('DB Phase 4: valve staging row preserves source values without inference', () => {
  const row = normalizeStagingRow(fixtures.valve);
  assert.equal(row.id, 'VALVE|GATE|NPS8|CL150|RF');
  assert.equal(row.dimensions.faceToFaceRfMm.value, 292);
  assert.equal(row.dimensions.faceToFaceRtjMm.value, 305);
  assert.equal(row.dimensions.buttWeldLengthMm.value, 419);
  assert.equal(row.weights.weightKg.value, 144);
  assert.equal(row.provenance.standard, 'ASME B16.10');
});

test('DB Phase 4: missing numeric values become UNAVAILABLE, never zero', () => {
  const row = normalizeStagingRow(fixtures.missingNumericValve);
  assert.equal(row.dimensions.faceToFaceRfMm.basis, VALUE_BASIS.UNAVAILABLE);
  assert.equal(row.dimensions.faceToFaceRtjMm.basis, VALUE_BASIS.UNAVAILABLE);
  assert.equal(row.weights.weightKg.basis, VALUE_BASIS.UNAVAILABLE);
  assert.equal(row.weights.weightKg.value, null);
});

test('DB Phase 4: provenance is mandatory and unsupported families are diagnostic-only', () => {
  assert.throws(() => makeNormalizedRow({ id: 'BAD', componentType: 'PIPE' }), /PROVENANCE_MISSING/);
  const row = normalizeStagingRow({ sourceId: 'Database/X/x.csv', sourceRowNumber: 1, raw: {}, inferred: { family: 'ODD' } });
  assert.equal(row.diagnostics[0].code, 'NORMALIZER_NOT_IMPLEMENTED');
  assert.equal(row.provenance.dataStatus, 'PARTIAL');
});

test('DB Phase 4: all tagged numeric leaves are finite', () => {
  for (const source of [fixtures.pipe, fixtures.valve, fixtures.missingNumericValve]) {
    const row = normalizeStagingRow(source);
    for (const { value } of collectTaggedValues(row)) {
      if (typeof value.value === 'number') assert.equal(Number.isFinite(value.value), true);
    }
  }
});

test('DB Phase 4: normalization modules and gate stay under 200 lines', () => {
  for (const file of [
    'src/normalize/valueBasis.js',
    'src/normalize/rowEnvelope.js',
    'src/normalize/normalizeStagingRows.js',
    'gates/db-phase-04-normalization-foundation.gate.test.js',
  ]) {
    const lines = fs.readFileSync(file, 'utf8').split('\n').length;
    assert.ok(lines <= 200, `${file} has ${lines} lines`);
  }
});
