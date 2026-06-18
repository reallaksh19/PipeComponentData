import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const preflight = JSON.parse(fs.readFileSync('data/audit/source-promotion-preflight.json', 'utf8'));
const supports = JSON.parse(fs.readFileSync('data/normalized/supports.json', 'utf8'));

function dimensionEntries(row) {
  return Object.values(row.dimensionValues ?? {});
}

test('DB Phase 31: support source promotion stays under manual review', () => {
  const decision = preflight.families.SUPPORT;
  assert.equal(decision.phase, 'DB_PHASE_31');
  assert.equal(decision.promoteRows, false);
  assert.equal(decision.decision, 'KEEP_PROJECT_OVERRIDE');
  assert.equal(decision.normalizedDatasetPresent, true);
  assert.deepEqual(supports.sourceRoots, ['docs/Pipedata/Database/Span', 'docs/Pipedata/Database/Gpas']);
});

test('DB Phase 31: support rows remain project overrides, not source-backed dimensions', () => {
  assert.equal(supports.generationMode, 'PROJECT_DEFAULT_AND_SOURCE_AVAILABILITY');
  assert.equal(supports.rows.length, 2);
  for (const row of supports.rows) {
    assert.equal(row.provenance.dataStatus, 'PROJECT_OVERRIDE');
    assert.equal(row.provenance.standard, 'PROJECT_SUPPORT_DEFAULTS');
    assert.match(row.provenance.source, /^adapter-default:/);
    for (const value of dimensionEntries(row)) {
      assert.ok(['PROJECT_DEFAULT', 'UNAVAILABLE'].includes(value.basis));
    }
  }
});

test('DB Phase 31: Span and Gpas are selector/config availability, not numeric support CSV promotion', () => {
  assert.equal(supports.sourceAvailability.Span.csvFiles, 0);
  assert.equal(supports.sourceAvailability.Gpas.csvFiles, 0);
  assert.equal(supports.sourceAvailability.Span.role, 'SPAN_SELECTOR_CONFIG');
  assert.equal(supports.sourceAvailability.Gpas.role, 'PIPE_SPACING_SELECTOR_CONFIG');
});
