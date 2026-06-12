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

test('DB Phase 28: expanded index entries resolve to catalogs', () => {
  const missing = [];
  for (const entry of searchIndex.entries) {
    const rows = catalogs[entry.source]?.rows ?? [];
    if (!rows.some((row) => row.id === entry.id)) missing.push(entry.id);
  }
  assert.deepEqual(missing, []);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'PIPE').length, 15);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'FLANGE').length, 33);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'VALVE').length, 8);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'FITTING').length, 15);
});

test('DB Phase 28: coverage dashboard is synced after wave 5 addenda', () => {
  const generated = buildCoverageDashboard({ manifest, searchIndex, catalogs });
  const committed = readJson('data/audit/db-coverage-dashboard.json');
  assert.equal(generated.summary.indexedEntryCount, 73);
  assert.equal(generated.summary.normalizedRowCount, 77);
  assert.equal(generated.summary.indexedResolvedRowCount, 73);
  assert.equal(generated.summary.missingCatalogRows, 0);
  assert.equal(committed.summary.indexedEntryCount, generated.summary.indexedEntryCount);
  assert.equal(committed.summary.normalizedRowCount, generated.summary.normalizedRowCount);
});

test('DB Phase 28: source ledger keeps non-source families blocked or under review', () => {
  const ledger = readJson('data/audit/source-expansion-ledger.json');
  assert.ok(['DB_PHASE_55', 'DB_PHASE_58'].includes(ledger.families.PIPE.latestPromotionPhase));
  assert.ok(['DB_PHASE_56', 'DB_PHASE_59'].includes(ledger.families.FLANGE.latestPromotionPhase));
  assert.equal(ledger.families.VALVE.latestPromotionPhase, 'DB_PHASE_49');
  assert.equal(ledger.families.FITTING.latestPromotionPhase, 'DB_PHASE_50');
  assert.equal(ledger.families.GASKET.status, 'BLOCKED_SOURCE_MISSING');
  assert.equal(ledger.families.SUPPORT.status, 'MANUAL_REVIEW');
  for (const family of Object.values(ledger.families)) assert.equal(family.productionComplete, false);
});
