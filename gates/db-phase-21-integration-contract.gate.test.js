import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const contract = JSON.parse(fs.readFileSync('data/exports/integration-contract.manifest.json', 'utf8'));
const publicPack = JSON.parse(fs.readFileSync('data/exports/public-export-pack.manifest.json', 'utf8'));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lookupApi = fs.readFileSync('src/db/lookupComponentExact.js', 'utf8');
const index = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));
const publicArtifactPaths = new Set(publicPack.publicArtifacts.map((artifact) => artifact.path));

test('DB Phase 21: integration manifest defines stable downstream lookup contract', () => {
  assert.equal(contract.schema, 'pipedata-integration-contract/v1');
  assert.equal(contract.phase, 'DB_PHASE_21');
  assert.equal(contract.status, 'STABLE_FOUNDATION_CONTRACT');
  assert.equal(contract.lookupRules.exactMatchOnly, true);
  assert.equal(contract.lookupRules.noNearestSize, true);
  assert.equal(contract.lookupRules.noNearestRating, true);
  assert.equal(contract.lookupRules.noNearestSchedule, true);
  assert.equal(contract.lookupRules.noFabricatedValues, true);
  assert.equal(contract.lookupRules.missingValues, 'null_or_UNAVAILABLE');
  assert.deepEqual(contract.allowedApis.map((api) => api.export), ['lookupComponentExact', 'LOOKUP_STATUS']);
});

test('DB Phase 21: integration contract exposes only approved public artifacts', () => {
  for (const path of contract.requiredAssets) {
    assert.equal(fs.existsSync(path), true, `${path} missing`);
    assert.ok(publicArtifactPaths.has(path), `${path} is not in public export pack`);
  }
  assert.ok(!contract.requiredAssets.includes('docs/Pipedata/Database'));
  assert.equal(publicPack.forbiddenArtifacts[0].path, 'docs/Pipedata/Database');
});

test('DB Phase 21: exact lookup implementation keeps no fallback status paths', () => {
  assert.match(lookupApi, /NO_EXACT_MATCH/);
  assert.match(lookupApi, /CATALOG_ROW_MISSING/);
  assert.match(index.noFallbackPolicy, /No nearest NPS/);
  assert.match(index.noFallbackPolicy, /rating/);
  assert.match(index.noFallbackPolicy, /schedule/);
});

test('DB Phase 21: foundation release candidate pack is public and conservative', () => {
  const rcPath = 'data/audit/foundation-release-candidate.json';
  const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
  assert.equal(rc.status, 'FOUNDATION_RELEASE_CANDIDATE');
  assert.equal(rc.productionComplete, false);
  assert.equal(rc.policy.noFabricatedEngineeringValues, true);
  assert.ok(publicArtifactPaths.has(rcPath));
  assert.ok(fs.existsSync('CHANGELOG.md'));
  assert.ok(fs.existsSync('docs/release-candidate.md'));
});

test('DB Phase 21: integration gate remains before expansion and stabilization gates', () => {
  assert.equal(packageJson.scripts['db:gate21'], 'npm run db:gate20 && node --test gates/db-phase-21-integration-contract.gate.test.js');
  assert.match(packageJson.scripts['db:test'], /db:gate(2[1-9]|3[0-9]|4[0-9]|50)/);
});
