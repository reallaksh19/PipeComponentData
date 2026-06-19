import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const preflight = JSON.parse(fs.readFileSync('data/audit/source-promotion-preflight.json', 'utf8'));
const gaskets = JSON.parse(fs.readFileSync('data/normalized/gaskets.json', 'utf8'));

function values(row) {
  return Object.values(row.dimensions ?? {});
}

test('DB Phase 30: gasket family remains inventory-only until dimension tables are verified', () => {
  const decision = preflight.families.GASKET;
  assert.equal(decision.phase, 'DB_PHASE_30');
  assert.equal(decision.promoteRows, false);
  assert.equal(decision.decision, 'KEEP_INVENTORY_ONLY');
  assert.equal(decision.normalizedDatasetPresent, true);
  assert.equal(gaskets.metadata.generationMode, 'SOURCE_INVENTORY_SELECTOR_ROWS_ONLY');
});

test('DB Phase 30: gasket rows do not contain fabricated numeric dimensions', () => {
  assert.equal(gaskets.rows.length, 3);
  for (const row of gaskets.rows) {
    assert.equal(row.dataStatus, 'MISSING_DIMENSION');
    assert.equal(row.standard, 'SOURCE_INVENTORY_ONLY');
    for (const dimension of values(row)) {
      assert.equal(dimension.value, null, `${row.id} must not promote a numeric value`);
      assert.equal(dimension.basis, 'UNAVAILABLE', `${row.id} must remain unavailable`);
    }
  }
});

test('DB Phase 30: size/class-specific gasket coverage is not implied', () => {
  for (const row of gaskets.rows) {
    assert.equal(row.nps, null);
    assert.equal(row.classRating, null);
  }
  assert.equal(gaskets.rows.some((row) => row.id.includes('NPS4') || row.id.includes('CL300')), false);
});
