import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const policyPath = 'data/audit/source-use-policy.json';
const docsPath = 'docs/data-governance.md';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const publicPack = JSON.parse(fs.readFileSync('data/exports/public-export-pack.manifest.json', 'utf8'));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function sourceScope(name) {
  return policy.sourceScopes.find((scope) => scope.name === name);
}

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

test('DB Phase 19: raw source tree remains explicit, blocked, and approval-gated', () => {
  const raw = sourceScope('raw-source-database-tree');
  assert.ok(raw);
  assert.equal(raw.path, 'docs/Pipedata/Database');
  assert.equal(raw.pagesPublished, false);
  assert.equal(raw.normalStudioVisible, false);
  assert.equal(raw.status, 'NEEDS_OWNER_VERIFICATION_BEFORE_PUBLICATION');
  assert.ok(policy.approvalRequiredFor.includes('publishing docs/Pipedata/Database to GitHub Pages'));
});

test('DB Phase 19: public export pack publishes governance policy, not raw source tree', () => {
  const artifacts = publicPack.publicArtifacts.map((artifact) => artifact.path);
  const governanceArtifact = publicPack.publicArtifacts.find((artifact) => artifact.path === policyPath);
  assert.ok(governanceArtifact);
  assert.equal(governanceArtifact.kind, 'SOURCE_USE_POLICY');
  assert.equal(governanceArtifact.family, 'ALL');
  assert.ok(!artifacts.some((path) => path.startsWith('docs/Pipedata/Database')));
  assert.deepEqual(publicPack.forbiddenArtifacts.map((artifact) => artifact.path), ['docs/Pipedata/Database']);
});

test('DB Phase 19: Pages workflow publishes audit policy and keeps raw DB excluded', () => {
  const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /cp data\/audit\/\*\.json _site\/data\/audit\//);
  assert.match(workflow, /test -f _site\/data\/audit\/source-use-policy\.json/);
  assert.match(workflow, /Raw source database tree must not be published to Pages/);
  assert.doesNotMatch(workflow, /cp -R docs\/Pipedata\/Database/);
});

test('DB Phase 19: human governance document states the same safety rules', () => {
  const doc = fs.readFileSync(docsPath, 'utf8');
  assert.match(doc, /Source-use rights.*require owner verification/i);
  assert.match(doc, /Do not publish the raw source database tree through GitHub Pages/i);
  assert.match(doc, /No fabricated dimensions, weights, schedules, ratings/i);
  assert.match(doc, /Missing source values remain `null` or `UNAVAILABLE`/i);
  assert.match(doc, /No nearest-size, nearest-rating, nearest-schedule, or fuzzy engineering fallback/i);
});

test('DB Phase 19: db:test includes governance gate', () => {
  assert.equal(packageJson.scripts['db:gate19'], 'npm run db:gate18 && node --test gates/db-phase-19-data-governance.gate.test.js');
  assert.equal(packageJson.scripts['db:test'], 'npm run db:gate19');
});
