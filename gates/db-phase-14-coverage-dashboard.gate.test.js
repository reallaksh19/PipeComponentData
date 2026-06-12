import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildCoverageDashboard, validateCoverageDashboard } from '../src/db/coverageDashboard.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const manifest = readJson('data/exports/db-export-manifest.json');
const searchIndex = readJson('data/indexes/component-search.index.json');
const catalogs = Object.fromEntries(
  manifest.artifacts
    .filter((artifact) => artifact.kind === 'NORMALIZED_DATA')
    .map((artifact) => [artifact.path, readJson(artifact.path)]),
);

function dashboard() {
  return buildCoverageDashboard({ manifest, searchIndex, catalogs });
}

test('DB Phase 14: coverage dashboard validates and preserves no-fabrication policy', () => {
  const result = dashboard();
  const validation = validateCoverageDashboard(result);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(validation.ok, true, JSON.stringify(validation.diagnostics));
  assert.equal(result.schema, 'pipedata-db-coverage-dashboard/v1');
  assert.equal(result.phase, 'DB_PHASE_14');
  assert.equal(result.policy.noFabrication, true);
  assert.equal(result.policy.noEngineeringFallback, true);
  assert.equal(result.policy.missingValuesRemainNull, true);
});

test('DB Phase 14: coverage summary counts normalized rows and data states', () => {
  const result = dashboard();
  assert.equal(result.summary.familyCount, 6);
  assert.equal(result.summary.indexedEntryCount, 6);
  assert.equal(result.summary.normalizedRowCount, 15);
  assert.equal(result.summary.readyRows, 8);
  assert.equal(result.summary.partialRows, 2);
  assert.equal(result.summary.missingDimensionRows, 3);
  assert.equal(result.summary.projectOverrideRows, 2);
  assert.deepEqual(result.summary.statusCounts, {
    PARTIAL: 2,
    READY: 8,
    MISSING_DIMENSION: 3,
    PROJECT_OVERRIDE: 2,
  });
});

test('DB Phase 14: indexed rows unresolved in normalized catalogs are explicit gaps', () => {
  const result = dashboard();
  assert.equal(result.summary.indexedResolvedRowCount, 3);
  assert.equal(result.summary.missingCatalogRows, 3);
  assert.deepEqual(result.gaps.map((gap) => gap.id).sort(), [
    'FITTING|BW|ELBOW90|NPS4|SCH40',
    'GASKET|RTJ|NPS4|CL300',
    'SUPPORT|SHOE|PROJECT_DEFAULT',
  ].sort());
  assert.equal(result.families.FITTING.coverageStatus, 'INDEX_MISMATCH');
  assert.equal(result.families.GASKET.coverageStatus, 'INDEX_MISMATCH');
  assert.equal(result.families.SUPPORT.coverageStatus, 'INDEX_MISMATCH');
});

test('DB Phase 14: source coverage exposes sampled and missing-dimension families', () => {
  const result = dashboard();
  assert.equal(result.families.PIPE.sourceCoverage.sourceRowCount, 489);
  assert.equal(result.families.PIPE.sourceCoverage.sampledRowCount, 2);
  assert.equal(result.families.FLANGE.sourceCoverage.explodedRowCount, 483);
  assert.equal(result.families.FLANGE.coverageStatus, 'PARTIAL_SAMPLE');
  assert.equal(result.families.GASKET.missingDimensionRows, 3);
  assert.equal(result.families.SUPPORT.projectOverrideRows, 2);
  assert.equal(result.summary.unsupportedOrConfigOnlyFamilyCount, 2);
});

test('DB Phase 14: committed audit JSON is exportable and in sync with live coverage summary', () => {
  const generated = dashboard();
  const committed = readJson('data/audit/db-coverage-dashboard.json');
  const validation = validateCoverageDashboard(committed);
  assert.equal(validation.ok, true, JSON.stringify(validation.diagnostics));
  assert.equal(committed.schema, generated.schema);
  assert.equal(committed.phase, generated.phase);
  assert.equal(committed.summary.familyCount, generated.summary.familyCount);
  assert.equal(committed.summary.indexedEntryCount, generated.summary.indexedEntryCount);
  assert.equal(committed.summary.normalizedRowCount, generated.summary.normalizedRowCount);
  assert.equal(committed.summary.missingCatalogRows, generated.summary.missingCatalogRows);
  assert.deepEqual(committed.gaps.map((gap) => gap.id).sort(), generated.gaps.map((gap) => gap.id).sort());
});

test('DB Phase 14: helper and gate stay under accepted 300-line limit', () => {
  for (const file of ['src/db/coverageDashboard.js', 'gates/db-phase-14-coverage-dashboard.gate.test.js']) {
    const lines = fs.readFileSync(file, 'utf8').trimEnd().split('\n').length;
    assert.ok(lines <= 300, `${file} has ${lines} lines`);
  }
});
