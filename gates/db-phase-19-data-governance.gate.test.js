import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const policyPath = 'data/audit/source-use-policy.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const publicPack = JSON.parse(fs.readFileSync('data/exports/public-export-pack.manifest.json', 'utf8'));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('DB Phase 19: source-use policy declares conservative publication status', () => {
  assert.equal(policy.schema, 'pipedata-source-use-policy/v1');
  assert.equal(policy.phase, 'DB_PHASE_19');
  assert.equal(policy.status, 'SOURCE_RIGHTS_NEED_OWNER_VERIFICATION');
  assert.equal(policy.policy.rawSourceTreePublishedToPages, false);
  assert.equal(policy.policy.normalStudioExposesRawSourceTree, false);
  assert.equal(policy.policy.sourceProvenanceRequired, true);
  assert.equal(policy.policy.missingValues, 'null_or_UNAVAILABLE');
  assert.equal(policy.policy.noFabricatedEngineeringValues, true);
  assert.equal(policy.policy.noNearestEngineeringFallback, true);
});

test('DB Phase 19: raw source scope remains approval-gated and not public', () => {
  const raw = policy.sourceScopes.find((scope) => scope.name === 'raw-source-database-tree');
  assert.ok(raw);
  assert.equal(raw.pagesPublished, false);
  assert.equal(raw.normalStudioVisible, false);
  assert.equal(raw.status, 'NEEDS_OWNER_VERIFICATION_BEFORE_PUBLICATION');
  assert.ok(policy.approvalRequiredFor.some((item) => item.includes('GitHub Pages')));
});

test('DB Phase 19: public export pack publishes governance policy, not forbidden artifacts', () => {
  const governanceArtifact = publicPack.publicArtifacts.find((artifact) => artifact.path === policyPath);
  assert.ok(governanceArtifact);
  assert.equal(governanceArtifact.kind, 'SOURCE_USE_POLICY');
  assert.equal(governanceArtifact.family, 'ALL');
  assert.equal(publicPack.forbiddenArtifacts.length, 1);
  assert.ok(!publicPack.publicArtifacts.some((artifact) => artifact.path === publicPack.forbiddenArtifacts[0].path));
});

test('DB Phase 19: human governance document states the same safety rules', () => {
  const doc = fs.readFileSync('docs/data-governance.md', 'utf8');
  assert.match(doc, /Source-use rights.*require owner verification/i);
  assert.match(doc, /No fabricated dimensions, weights, schedules, ratings/i);
  assert.match(doc, /Missing source values remain `null` or `UNAVAILABLE`/i);
});

test('DB Phase 19: governance gate remains in the db chain after later phases', () => {
  assert.equal(packageJson.scripts['db:gate19'], 'npm run db:gate18 && node --test gates/db-phase-19-data-governance.gate.test.js');
  assert.match(packageJson.scripts['db:gate20'], /db:gate19/);
  assert.match(packageJson.scripts['db:test'], /db:gate(2[1-9]|[3-5][0-9]|6[0-3])/);
});
