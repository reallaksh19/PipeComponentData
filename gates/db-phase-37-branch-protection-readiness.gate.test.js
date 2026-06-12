import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const artifact = JSON.parse(fs.readFileSync('data/audit/branch-protection-readiness.json', 'utf8'));
const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');

test('DB Phase 37: branch protection readiness artifact is foundation-scoped', () => {
  assert.equal(artifact.schema, 'pipedata-branch-protection-readiness/v1');
  assert.equal(artifact.phase, 'DB_PHASE_37');
  assert.equal(artifact.status, 'POLICY_READY_FOR_OWNER_REVIEW');
  assert.equal(artifact.releasePolicy.foundationReleaseOnly, true);
  assert.equal(artifact.releasePolicy.productionComplete, false);
});

test('DB Phase 37: recommended settings require PR and CI discipline', () => {
  assert.equal(artifact.recommendedSettings.protectMain, true);
  assert.equal(artifact.recommendedSettings.requirePullRequest, true);
  assert.equal(artifact.recommendedSettings.requireCiGreenBeforeMerge, true);
  assert.equal(artifact.recommendedSettings.requireNode20AndNode22Gates, true);
  assert.equal(artifact.recommendedSettings.requirePagesDeployAfterMerge, true);
});

test('DB Phase 37: CI still runs the required Node matrix', () => {
  assert.match(ci, /20\.x/);
  assert.match(ci, /22\.x/);
  assert.ok(artifact.requiredChecks.includes('Node 20.x gates'));
  assert.ok(artifact.requiredChecks.includes('Node 22.x gates'));
});
