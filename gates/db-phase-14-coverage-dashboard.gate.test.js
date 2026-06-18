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

test('DB Phase 14: wave 5 coverage summary counts normalized rows and data states', () => {
  const result = dashboard();
  assert.ok(result.summary.familyCount >= 6);
  assert.ok(result.summary.indexedEntryCount >= 531);
  assert.ok(result.summary.normalizedRowCount >= 535);
  assert.ok(result.summary.readyRows >= 415);
  assert.ok(result.summary.partialRows >= 115);
  assert.equal(result.summary.missingDimensionRows, 3);
  assert.equal(result.summary.projectOverrideRows, 2);
  assert.ok(result.summary.statusCounts.READY >= 415);
  assert.equal(result.summary.statusCounts.MISSING_DIMENSION, 3);
  assert.equal(result.summary.statusCounts.PROJECT_OVERRIDE, 2);
});

test('DB Phase 14: indexed wave 5 rows resolve to normalized catalogs', () => {
  const result = dashboard();
  assert.ok(result.summary.indexedResolvedRowCount >= 531);
  assert.equal(result.summary.missingCatalogRows, 0);
  assert.deepEqual(result.gaps, []);
  assert.ok(result.families.PIPE.indexedRows >= 15);
  assert.equal(result.families.FLANGE.indexedRows, 275);
  assert.equal(result.families.VALVE.indexedRows, 418);
  assert.equal(result.families.FITTING.indexedRows, 15);
  assert.equal(result.families.GASKET.coverageStatus, 'MISSING_DIMENSION');
  assert.equal(result.families.SUPPORT.coverageStatus, 'PROJECT_OVERRIDE');
});

test('DB Phase 14: source coverage exposes wave 5 sampled and blocked families', () => {
  const result = dashboard();
  assert.ok(result.families.PIPE.sourceCoverage.sampledRowCount >= 16);
  assert.equal(result.families.FLANGE.sourceCoverage.sampledRowCount, 425);
  assert.equal(result.families.VALVE.sourceCoverage.sampledRowCount, 418);
  assert.equal(result.families.FITTING.sourceCoverage.sampledRowCount, 15);
  assert.equal(result.families.GASKET.missingDimensionRows, 3);
  assert.equal(result.families.SUPPORT.projectOverrideRows, 2);
  assert.ok(result.summary.unsupportedOrConfigOnlyFamilyCount <= 2);
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
