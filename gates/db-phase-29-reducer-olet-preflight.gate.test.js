import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const preflight = JSON.parse(fs.readFileSync('data/audit/source-promotion-preflight.json', 'utf8'));
const folderMap = JSON.parse(fs.readFileSync('data/raw-manifest/folder-family-map.json', 'utf8'));

const byFolder = Object.fromEntries(folderMap.folders.map((row) => [row.folder, row]));

test('DB Phase 29: reducer-like sources remain manual review only', () => {
  const reducer = preflight.families.REDUCER;
  assert.equal(reducer.phase, 'DB_PHASE_29');
  assert.equal(reducer.promoteRows, false);
  assert.equal(reducer.decision, 'MANUAL_REVIEW_REQUIRED');
  assert.equal(reducer.normalizedDatasetPresent, false);
  assert.equal(fs.existsSync('data/normalized/reducers.json'), false);
  assert.equal(byFolder.Fswa.family, 'FITTING');
  assert.equal(byFolder.Fswa.subfamily, 'SWAGE_NIPPLE');
});

test('DB Phase 29: olet raw folders exist but no normalized olet catalog is promoted', () => {
  const olet = preflight.families.OLET;
  assert.equal(olet.phase, 'DB_PHASE_29');
  assert.equal(olet.promoteRows, false);
  assert.equal(olet.decision, 'BLOCKED_UNTIL_NORMALIZED_SCHEMA');
  assert.equal(olet.normalizedDatasetPresent, false);
  assert.equal(fs.existsSync('data/normalized/olets.json'), false);
  assert.equal(byFolder.Wbol.family, 'OLET');
  assert.equal(byFolder.Wbol.subfamily, 'BRANCH_OLET');
  assert.equal(byFolder.Wbpi.family, 'OLET');
  assert.equal(byFolder.Wbpi.subfamily, 'PIPET');
});

test('DB Phase 29: preflight keeps no-fabrication and no-fallback policy active', () => {
  assert.equal(preflight.policy.sourceBackedPromotionOnly, true);
  assert.equal(preflight.policy.noFabricatedEngineeringValues, true);
  assert.equal(preflight.policy.noNearestEngineeringFallback, true);
  assert.equal(preflight.policy.missingValues, 'null_or_UNAVAILABLE');
});
