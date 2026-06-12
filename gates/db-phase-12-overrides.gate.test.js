import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildOverrideIndex, validateOverridePack, applyOverrides } from '../src/db/projectOverrides.js';

const overrides = JSON.parse(fs.readFileSync('data/overrides/project-overrides.sample.json', 'utf8'));
const valveCatalog = JSON.parse(fs.readFileSync('data/normalized/valves.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('data/indexes/override.index.json', 'utf8'));

function rows() {
  return valveCatalog.rows ?? valveCatalog.entries ?? [];
}

test('DB Phase 12: override pack is explicit and provenance complete', () => {
  const result = validateOverridePack(overrides);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(overrides.conflictPolicy, 'REQUIRE_EXPLICIT_PROJECT_OVERRIDE');
  assert.equal(overrides.overrides[0].dataStatus, 'PROJECT_OVERRIDE');
  assert.equal(overrides.overrides[0].provenance.dataStatus, 'PROJECT_OVERRIDE');
});

test('DB Phase 12: applying override does not mutate source catalog rows', () => {
  const baseRows = rows();
  const originalWeight = baseRows[0].dimensions.weightKg.value;
  const applied = applyOverrides(baseRows, overrides);
  assert.equal(applied.ok, true, JSON.stringify(applied.diagnostics));
  assert.equal(baseRows[0].dimensions.weightKg.value, originalWeight);
  assert.equal(applied.rows[0].dimensions.weightKg.value, 150);
  assert.equal(applied.rows[0].dimensions.weightKg.basis, 'PROJECT_OVERRIDE');
  assert.equal(applied.rows[0].dimensions.weightKg.sourceValue, 144);
  assert.equal(applied.rows[0].overrideStatus, 'HAS_PROJECT_OVERRIDE');
});

test('DB Phase 12: override index matches override pack with no duplicate keys', () => {
  const built = buildOverrideIndex(overrides);
  assert.deepEqual(built.duplicates, []);
  assert.equal(index.entries.length, overrides.overrides.length);
  assert.equal(index.entries[0].id, overrides.overrides[0].id);
  assert.equal(index.entries[0].targetId, overrides.overrides[0].targetId);
});

test('DB Phase 12: override target misses are diagnostic only', () => {
  const missing = structuredClone(overrides);
  missing.overrides[0].targetId = 'VALVE|MISSING';
  const applied = applyOverrides(rows(), missing);
  assert.equal(applied.ok, false);
  assert.equal(applied.diagnostics[0].code, 'OVERRIDE_TARGET_MISSING');
});

test('DB Phase 12: override helper and gate stay under 200 lines', () => {
  for (const file of ['src/db/projectOverrides.js', 'gates/db-phase-12-overrides.gate.test.js']) {
    const lines = fs.readFileSync(file, 'utf8').trimEnd().split('\n').length;
    assert.ok(lines <= 200, `${file} has ${lines} lines`);
  }
});
