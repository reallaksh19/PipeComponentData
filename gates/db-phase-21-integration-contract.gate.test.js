import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const contractPath = 'data/exports/integration-contract.manifest.json';
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const publicPack = JSON.parse(fs.readFileSync('data/exports/public-export-pack.manifest.json', 'utf8'));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const searchIndex = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));
const aliases = JSON.parse(fs.readFileSync('data/search/component-aliases.json', 'utf8'));

function catalogAssets() {
  const catalogs = {};
  for (const artifact of publicPack.publicArtifacts.filter((item) => item.kind === 'NORMALIZED_DATA')) {
    catalogs[artifact.path] = JSON.parse(fs.readFileSync(artifact.path, 'utf8'));
  }
  return { searchIndex, aliases, catalogs };
}

test('DB Phase 21: integration contract publishes stable public API and public assets only', () => {
  assert.equal(contract.schema, 'pipedata-integration-contract/v1');
  assert.equal(contract.phase, 'DB_PHASE_21');
  assert.equal(contract.status, 'STABLE_FOUNDATION_CONTRACT');
  assert.deepEqual(contract.allowedApis.map((api) => api.export), ['lookupComponentExact', 'LOOKUP_STATUS']);
  assert.deepEqual(contract.forbiddenApis.map((api) => api.export), ['componentSearch', 'SEARCH_MODE']);
  assert.ok(publicPack.publicArtifacts.some((artifact) => artifact.path === contractPath));
  assert.ok(!contract.requiredAssets.some((path) => path.startsWith('docs/Pipedata/Database')));
});

test('DB Phase 21: every required integration asset exists and is public-pack approved where applicable', () => {
  const publicArtifactPaths = publicPack.publicArtifacts.map((artifact) => artifact.path);
  for (const path of contract.requiredAssets) {
    assert.ok(fs.existsSync(path), `${path} is missing`);
    assert.ok(publicArtifactPaths.includes(path) || path === contractPath, `${path} is not public-pack approved`);
  }
});

test('DB Phase 21: exact lookup contract blocks engineering fallback', () => {
  const assets = catalogAssets();
  const found = lookupComponentExact('GATE VALVE 8 150 RF', assets, {
    filters: { componentType: 'VALVE', valveType: 'GATE', nps: '8', classRating: '150', facing: 'RF' },
  });
  assert.equal(found.status, LOOKUP_STATUS.FOUND);
  assert.equal(found.row.dataStatus, 'READY');

  const wrongRating = lookupComponentExact('GATE VALVE 8 300 RF', assets, {
    filters: { componentType: 'VALVE', valveType: 'GATE', nps: '8', classRating: '300', facing: 'RF' },
  });
  assert.equal(wrongRating.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 21: partial gasket data remains unavailable, not promoted', () => {
  const gasket = lookupComponentExact('RTJ GASKET', catalogAssets(), {
    filters: { componentType: 'GASKET', subtype: 'RTJ', facing: 'RTJ' },
  });
  assert.equal(gasket.status, LOOKUP_STATUS.FOUND);
  assert.equal(gasket.row.dataStatus, 'MISSING_DIMENSION');
  for (const field of Object.values(gasket.row.dimensions ?? {})) {
    assert.equal(field.value, null);
    assert.equal(field.basis, 'UNAVAILABLE');
  }
});

test('DB Phase 21: foundation release candidate pack is public and conservative', () => {
  const rcPath = 'data/audit/foundation-release-candidate.json';
  const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
  const publicArtifactPaths = new Set(publicPack.publicArtifacts.map((artifact) => artifact.path));

  assert.equal(rc.status, 'FOUNDATION_RELEASE_CANDIDATE');
  assert.equal(rc.releaseClass, 'SOURCE_BACKED_FOUNDATION');
  assert.equal(rc.productionComplete, false);
  assert.equal(rc.policy.exactMatchOnly, true);
  assert.equal(rc.policy.noEngineeringFallback, true);
  assert.equal(rc.policy.noFabricatedEngineeringValues, true);
  assert.ok(publicArtifactPaths.has(rcPath));
  assert.ok(fs.existsSync('CHANGELOG.md'));
  assert.ok(fs.existsSync('docs/release-candidate.md'));
});

test('DB Phase 21: integration gate remains before expansion gates', () => {
  assert.equal(packageJson.scripts['db:gate21'], 'npm run db:gate20 && node --test gates/db-phase-21-integration-contract.gate.test.js');
  assert.match(packageJson.scripts['db:test'], /db:gate(2[1-9]|3[0-1])/);
});
