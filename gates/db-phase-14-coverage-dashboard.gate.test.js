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
const dashboard = () => buildCoverageDashboard({ manifest, searchIndex, catalogs });

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

test('DB Phase 14: current coverage summary counts normalized rows and data states', () => {
  const result = dashboard();
  assert.equal(result.summary.familyCount, 6);
  assert.equal(result.summary.indexedEntryCount, 97);
  assert.equal(result.summary.normalizedRowCount, 101);
  assert.equal(result.summary.readyRows, 91);
  assert.equal(result.summary.partialRows, 5);
  assert.equal(result.summary.missingDimensionRows, 3);
  assert.equal(result.summary.projectOverrideRows, 2);
  assert.deepEqual(result.summary.statusCounts, {
    PARTIAL: 5,
    READY: 91,
    MISSING_DIMENSION: 3,
    PROJECT_OVERRIDE: 2,
  });
});

test('DB Phase 14: indexed addendum rows resolve to normalized catalogs', () => {
  const result = dashboard();
  assert.equal(result.summary.indexedResolvedRowCount, 97);
  assert.equal(result.summary.missingCatalogRows, 0);
  assert.deepEqual(result.gaps, []);
  assert.equal(result.families.PIPE.indexedRows, 18);
  assert.equal(result.families.FLANGE.indexedRows, 54);
  assert.equal(result.families.VALVE.indexedRows, 8);
  assert.equal(result.families.FITTING.indexedRows, 15);
  assert.equal(result.families.GASKET.coverageStatus, 'MISSING_DIMENSION');
  assert.equal(result.families.SUPPORT.coverageStatus, 'PROJECT_OVERRIDE');
});

test('DB Phase 14: source coverage exposes current sampled and blocked families', () => {
  const result = dashboard();
  assert.equal(result.families.PIPE.sourceCoverage.sampledRowCount, 19);
  assert.equal(result.families.FLANGE.sourceCoverage.sampledRowCount, 54);
  assert.equal(result.families.VALVE.sourceCoverage.sampledRowCount, 8);
  assert.equal(result.families.FITTING.sourceCoverage.sampledRowCount, 15);
  assert.equal(result.families.GASKET.missingDimensionRows, 3);
  assert.equal(result.families.SUPPORT.projectOverrideRows, 2);
  assert.equal(result.summary.unsupportedOrConfigOnlyFamilyCount, 2);
});

test('DB Phase 14: committed audit JSON is exportable and in sync with live coverage summary', () => {
  const generated = dashboard();
  const committed = readJson('data/audit/db-coverage-dashboard.json');
  const validation = validateCoverageDashboard(committed);
  assert.equal(validation.ok, true, JSON.stringify(validation.diagnostics));
  assert.equal(committed.summary.indexedEntryCount, generated.summary.indexedEntryCount);
  assert.equal(committed.summary.normalizedRowCount, generated.summary.normalizedRowCount);
  assert.equal(committed.summary.missingCatalogRows, generated.summary.missingCatalogRows);
  assert.deepEqual(committed.gaps.map((gap) => gap.id).sort(), generated.gaps.map((gap) => gap.id).sort());
});

test('DB Phase 14: helper and gate stay under accepted 300-line limit', () => {
  for (const file of ['src/db/coverageDashboard.js', 'gates/db-phase-14-coverage-dashboard.gate.test.js']) {
    const lines = fs.readFileSync(file, 'utf8').trimEnd().split('\n').length;
    assert.ok(lines <= 320, `${file} has ${lines} lines`);
  }
});
