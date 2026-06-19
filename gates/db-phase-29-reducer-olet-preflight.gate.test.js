import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const preflight = JSON.parse(fs.readFileSync('data/audit/source-promotion-preflight.json', 'utf8'));
const folderMap = JSON.parse(fs.readFileSync('data/raw-manifest/folder-family-map.json', 'utf8'));

const byFolder = Object.fromEntries(folderMap.folders.map((row) => [row.folder, row]));

test('DB Phase 29: reducer source rows are now promoted from explicit matrix cells', () => {
  const reducer = preflight.families.REDUCER;
  assert.equal(reducer.phase, 'DB_PHASE_29');
  assert.equal(reducer.promoteRows, true);
  assert.equal(reducer.decision, 'PROMOTED_FROM_SOURCE_MATRIX');
  assert.equal(reducer.normalizedDatasetPresent, true);
  assert.equal(fs.existsSync('data/normalized/reducers-sch80-wave1.json'), true);
  assert.equal(reducer.sourceEvidence.includes('docs/Pipedata/Database/Ftbw/Reducers80.csv'), true);
  assert.equal(byFolder.Fswa.family, 'FITTING');
  assert.equal(byFolder.Fswa.subfamily, 'SWAGE_NIPPLE');
});

test('DB Phase 29: olet raw folders exist and normalized olet catalog is promoted', () => {
  const olet = preflight.families.OLET;
  assert.equal(olet.phase, 'DB_PHASE_29');
  assert.equal(olet.promoteRows, true);
  assert.equal(olet.decision, 'SCHEMA_PROMOTED_READY_FOR_ROWS');
  assert.equal(olet.normalizedDatasetPresent, true);
  assert.equal(fs.existsSync('data/normalized/olets-weldolet.json'), true);
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
