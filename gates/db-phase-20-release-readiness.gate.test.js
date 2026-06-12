import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readiness = JSON.parse(fs.readFileSync('data/audit/release-readiness.json', 'utf8'));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('DB Phase 20: release readiness is foundation-ready only', () => {
  assert.equal(readiness.schema, 'pipedata-release-readiness/v1');
  assert.equal(readiness.phase, 'DB_PHASE_20');
  assert.equal(readiness.status, 'FOUNDATION_READY');
  assert.equal(readiness.productStatus, 'SOURCE_BACKED_FOUNDATION');
  assert.equal(readiness.productionComplete, false);
  assert.equal(readiness.policy.noFabricatedEngineeringValues, true);
  assert.equal(readiness.policy.noEngineeringFallback, true);
  assert.equal(readiness.policy.exactLookupOnly, true);
});

test('DB Phase 20: unresolved risks remain visible before any production claim', () => {
  assert.ok(readiness.openRisks.includes('FULL_NORMALIZED_PRODUCTION_COVERAGE_INCOMPLETE'));
  assert.ok(readiness.openRisks.includes('SOURCE_USE_RIGHTS_NEED_OWNER_VERIFICATION'));
  assert.ok(readiness.openRisks.includes('GASKET_SUPPORT_OLET_REDUCER_COVERAGE_PARTIAL_OR_BLOCKED'));
});

test('DB Phase 20: readiness evidence files exist', () => {
  assert.equal(readiness.evidence.npmTestExpected, true);
  assert.equal(readiness.evidence.pagesArtifactMinimal, true);
  assert.equal(readiness.evidence.uiSmokeGate, true);
  assert.equal(readiness.evidence.typescriptDeclarations, true);
  for (const key of ['publicExportPack', 'sourceUsePolicy', 'coverageDashboard', 'integrationContract']) {
    assert.ok(fs.existsSync(readiness.evidence[key]), `${key} is missing`);
  }
});

test('DB Phase 20: readiness gate is wired before integration and expansion gates', () => {
  assert.equal(packageJson.scripts['db:gate20'], 'npm run db:gate19 && node --test gates/db-phase-20-release-readiness.gate.test.js');
  assert.match(packageJson.scripts['db:gate21'], /db:gate20/);
  assert.match(packageJson.scripts['db:test'], /db:gate(2[1-9]|3[0-6])/);
});
