import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readinessPath = 'data/audit/release-readiness.json';
const readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8'));
const sourcePolicy = JSON.parse(fs.readFileSync('data/audit/source-use-policy.json', 'utf8'));
const publicPack = JSON.parse(fs.readFileSync('data/exports/public-export-pack.manifest.json', 'utf8'));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const publicArtifacts = publicPack.publicArtifacts.map((artifact) => artifact.path);

test('DB Phase 20: release readiness is foundation-ready, not production-complete', () => {
  assert.equal(readiness.schema, 'pipedata-release-readiness/v1');
  assert.equal(readiness.phase, 'DB_PHASE_20');
  assert.equal(readiness.status, 'FOUNDATION_READY');
  assert.equal(readiness.releaseClass, 'SOURCE_BACKED_FOUNDATION');
  assert.equal(readiness.productionComplete, false);
  assert.equal(readiness.dataCoverageComplete, false);
  assert.equal(readiness.releaseLanguage.allowed, 'source-backed foundation release');
  assert.equal(readiness.releaseLanguage.blocked, 'production-complete engineering catalog');
});

test('DB Phase 20: release readiness carries conservative data safety policy', () => {
  assert.equal(readiness.safety.exactMatchOnly, true);
  assert.equal(readiness.safety.noEngineeringFallback, true);
  assert.equal(readiness.safety.noFabricatedEngineeringValues, true);
  assert.equal(readiness.safety.missingValues, 'null_or_UNAVAILABLE');
  assert.equal(readiness.safety.rawSourceTreePublishedToPages, false);
  assert.equal(readiness.safety.normalStudioExposesRawSourceTree, false);
  assert.equal(readiness.safety.sourceRightsNeedOwnerVerification, true);
  assert.equal(sourcePolicy.status, 'SOURCE_RIGHTS_NEED_OWNER_VERIFICATION');
});

test('DB Phase 20: readiness evidence points to existing public artifacts and gates', () => {
  assert.equal(readiness.evidence.adapterGatePhase, 13);
  assert.equal(readiness.evidence.dbGatePhase, 21);
  assert.equal(readiness.evidence.uiSmokeGate, true);
  assert.equal(readiness.evidence.typescriptDeclarations, true);
  for (const path of ['publicExportPack', 'sourceUsePolicy', 'coverageDashboard', 'integrationContract']) {
    assert.ok(fs.existsSync(readiness.evidence[path]), `${path} is missing`);
  }
  assert.ok(publicArtifacts.includes(readinessPath));
});

test('DB Phase 20: readiness gate is wired before integration gate', () => {
  assert.equal(packageJson.scripts['db:gate20'], 'npm run db:gate19 && node --test gates/db-phase-20-release-readiness.gate.test.js');
  assert.match(packageJson.scripts['db:gate21'], /db:gate20/);
  assert.equal(packageJson.scripts['db:test'], 'npm run db:gate21');
});
