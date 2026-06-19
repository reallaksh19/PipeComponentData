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
  const pipeCount = searchIndex.entries.filter((entry) => entry.family === 'PIPE').length;
  if (!fs.existsSync('data/normalized/pipes-expanded.json')) {
    assert.equal(pipeCount, 18);
  } else {
    assert.ok(pipeCount >= 18);
  }
  assert.ok(searchIndex.entries.filter((entry) => entry.family === 'FLANGE').length >= 275);
  assert.ok(searchIndex.entries.filter((entry) => entry.family === 'VALVE').length >= 418);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'FITTING').length, 3898);
  assert.equal(searchIndex.entries.filter((entry) => entry.family === 'OLET').length, 140);
});

test('DB Phase 28: coverage dashboard is synced after wave 5 addenda', () => {
  const generated = buildCoverageDashboard({ manifest, searchIndex, catalogs });
  const committed = readJson('data/audit/db-coverage-dashboard.json');
  assert.ok(generated.summary.indexedEntryCount >= 531);
  assert.ok(generated.summary.normalizedRowCount >= 535);
  assert.ok(generated.summary.indexedResolvedRowCount >= 531);
  assert.equal(generated.summary.missingCatalogRows, 0);
  assert.equal(committed.summary.indexedEntryCount, generated.summary.indexedEntryCount);
  assert.equal(committed.summary.normalizedRowCount, generated.summary.normalizedRowCount);
});

test('DB Phase 28: source ledger keeps non-source families blocked or under review', () => {
  const ledger = readJson('data/audit/source-expansion-ledger.json');
  assert.ok(['DB_PHASE_55', 'DB_PHASE_58', 'DB_PHASE_67', 'DB_PHASE_69', 'DB_PHASE_85'].includes(ledger.families.PIPE.latestPromotionPhase));
  assert.ok(['DB_PHASE_56', 'DB_PHASE_59', 'DB_PHASE_74', 'DB_PHASE_80'].includes(ledger.families.FLANGE.latestPromotionPhase));
  assert.ok(['DB_PHASE_49', 'DB_PHASE_76', 'DB_PHASE_81', 'DB_PHASE_82', 'DB_PHASE_83', 'DB_PHASE_84'].includes(ledger.families.VALVE.latestPromotionPhase));
  assert.equal(ledger.families.FITTING.latestPromotionPhase, 'DB_PHASE_87');
  assert.equal(ledger.families.GASKET.status, 'BLOCKED_SOURCE_MISSING');
  assert.equal(ledger.families.SUPPORT.status, 'MANUAL_REVIEW');
  assert.equal(ledger.families.OLET.latestPromotionPhase, 'DB_PHASE_79');
  for (const family of Object.values(ledger.families)) assert.equal(family.productionComplete, false);
});
