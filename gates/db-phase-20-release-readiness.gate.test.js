import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readiness = JSON.parse(fs.readFileSync('data/audit/release-readiness.json', 'utf8'));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('DB Phase 20: release readiness is foundation-ready only', () => {
  assert.equal(readiness.schema, 'pipedata-release-readiness/v1');
  assert.equal(readiness.phase, 'DB_PHASE_20');
  assert.equal(readiness.status, 'FOUNDATION_READY');
  assert.equal(readiness.releaseClass, 'SOURCE_BACKED_FOUNDATION');
  assert.equal(readiness.productionComplete, false);
  assert.equal(readiness.dataCoverageComplete, false);
  assert.equal(readiness.safety.noFabricatedEngineeringValues, true);
  assert.equal(readiness.safety.noEngineeringFallback, true);
  assert.equal(readiness.safety.exactMatchOnly, true);
});

test('DB Phase 20: unresolved risks remain visible before any production claim', () => {
  assert.ok(readiness.openRisks.some((item) => /production coverage is incomplete/i.test(item)));
  assert.ok(readiness.openRisks.some((item) => /source-use rights/i.test(item)));
  assert.ok(readiness.openRisks.some((item) => /Gasket, support, olet, reducer/i.test(item)));
  assert.equal(readiness.releaseLanguage.blocked, 'production-complete engineering catalog');
});

test('DB Phase 20: readiness evidence files exist', () => {
  assert.equal(readiness.evidence.adapterGatePhase, 13);
  assert.equal(readiness.evidence.dbGatePhase >= 21, true);
  assert.equal(readiness.evidence.uiSmokeGate, true);
  assert.equal(readiness.evidence.typescriptDeclarations, true);
  for (const key of ['publicExportPack', 'sourceUsePolicy', 'coverageDashboard', 'integrationContract']) {
    assert.ok(fs.existsSync(readiness.evidence[key]), `${key} is missing`);
  }
});

test('DB Phase 20: readiness gate is wired before integration and expansion gates', () => {
  assert.equal(packageJson.scripts['db:gate20'], 'npm run db:gate19 && node --test gates/db-phase-20-release-readiness.gate.test.js');
  assert.match(packageJson.scripts['db:gate21'], /db:gate20/);
  assert.match(packageJson.scripts['db:test'], /db:gate(2[1-9]|[3-5][0-9]|6[0-3])/);
});
