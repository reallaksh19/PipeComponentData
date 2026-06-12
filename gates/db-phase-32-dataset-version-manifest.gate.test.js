import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('data/audit/dataset-version-manifest.json', 'utf8'));

function exists(path) {
  return fs.existsSync(path);
}

test('DB Phase 32: dataset version manifest records foundation status only', () => {
  assert.equal(manifest.schema, 'pipedata-dataset-version-manifest/v1');
  assert.equal(manifest.phase, 'DB_PHASE_32');
  assert.equal(manifest.datasetVersion, 'pipedata-db/0.1.0-foundation');
  assert.equal(manifest.status, 'FOUNDATION_DATASET');
  assert.equal(manifest.productionComplete, false);
});

test('DB Phase 32: dataset policy keeps no-fabrication and no-fallback active', () => {
  assert.equal(manifest.policy.sourceBackedRowsOnly, true);
  assert.equal(manifest.policy.noFabricatedEngineeringValues, true);
  assert.equal(manifest.policy.noNearestEngineeringFallback, true);
  assert.equal(manifest.policy.missingValues, 'null_or_UNAVAILABLE');
  assert.equal(manifest.policy.rawSourceTreePublishedToPages, false);
});

test('DB Phase 32: every listed public catalog and index exists', () => {
  for (const row of manifest.catalogs) {
    assert.equal(exists(row.path), true, `${row.path} missing`);
    assert.match(row.coverage, /SOURCE_BACKED|INVENTORY_ONLY|PROJECT_OVERRIDE_ONLY/);
  }

  for (const path of [...manifest.indexes, ...manifest.audit]) {
    assert.equal(exists(path), true, `${path} missing`);
  }
});

test('DB Phase 32: remaining non-engineering families stay visibly non-production', () => {
  const byFamily = Object.fromEntries(manifest.catalogs.map((row) => [row.family, row]));
  assert.equal(byFamily.GASKET.coverage, 'INVENTORY_ONLY');
  assert.equal(byFamily.SUPPORT.coverage, 'PROJECT_OVERRIDE_ONLY');
});
