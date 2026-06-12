import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildCoverageDashboard } from '../src/db/coverageDashboard.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const manifest = readJson('data/exports/db-export-manifest.json');
const searchIndex = readJson('data/indexes/component-search.index.json');
const catalogs = Object.fromEntries(
  manifest.artifacts
    .filter((artifact) => artifact.kind === 'NORMALIZED_DATA')
    .map((artifact) => [artifact.path, readJson(artifact.path)]),
);

test('DB Phase 28: expanded valve and fitting index entries resolve to catalogs', () => {
  const missing = [];
  for (const entry of searchIndex.entries) {
    const rows = catalogs[entry.source]?.rows ?? [];
    if (!rows.some((row) => row.id === entry.id)) missing.push(entry.id);
  }
  assert.deepEqual(missing, []);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'VALVE').length, 5);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'FITTING').length, 9);
});

test('DB Phase 28: coverage dashboard is synced after valve and fitting expansion', () => {
  const generated = buildCoverageDashboard({ manifest, searchIndex, catalogs });
  const committed = readJson('data/audit/db-coverage-dashboard.json');
  assert.equal(generated.summary.indexedEntryCount, 29);
  assert.equal(generated.summary.normalizedRowCount, 33);
  assert.equal(generated.summary.indexedResolvedRowCount, 29);
  assert.equal(generated.summary.missingCatalogRows, 0);
  assert.equal(committed.summary.indexedEntryCount, generated.summary.indexedEntryCount);
  assert.equal(committed.summary.normalizedRowCount, generated.summary.normalizedRowCount);
});

test('DB Phase 28: source ledger keeps non-source families blocked or under review', () => {
  const ledger = readJson('data/audit/source-expansion-ledger.json');
  assert.equal(ledger.families.VALVE.promotionPhase, 'DB_PHASE_26');
  assert.equal(ledger.families.FITTING.promotionPhase, 'DB_PHASE_27');
  assert.equal(ledger.families.GASKET.status, 'BLOCKED_SOURCE_MISSING');
  assert.equal(ledger.families.SUPPORT.status, 'MANUAL_REVIEW');
  for (const family of Object.values(ledger.families)) assert.equal(family.productionComplete, false);
});
