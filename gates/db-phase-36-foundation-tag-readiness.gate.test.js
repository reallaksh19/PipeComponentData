import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readiness = JSON.parse(fs.readFileSync('data/audit/foundation-tag-readiness.json', 'utf8'));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const publicPack = JSON.parse(fs.readFileSync('data/exports/public-export-pack.manifest.json', 'utf8'));
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

const publicPaths = new Set(publicPack.publicArtifacts.map((item) => item.path));

test('DB Phase 36: foundation tag readiness is explicit and not production complete', () => {
  assert.equal(readiness.schema, 'pipedata-foundation-tag-readiness/v1');
  assert.equal(readiness.phase, 'DB_PHASE_36');
  assert.equal(readiness.recommendedTag, 'v0.1.0-foundation');
  assert.equal(readiness.packageVersion, packageJson.version);
  assert.equal(readiness.productionComplete, false);
  assert.equal(readiness.status, 'READY_TO_TAG_FOUNDATION_AFTER_MAIN_CI_GREEN');
});

test('DB Phase 36: required release evidence exists and is public when machine readable', () => {
  for (const path of readiness.requiredEvidence) {
    assert.equal(fs.existsSync(path), true, `${path} missing`);
    if (path.startsWith('data/')) assert.equal(publicPaths.has(path), true, `${path} not in public pack`);
  }
});

test('DB Phase 36: tag rules keep release conservative', () => {
  assert.equal(readiness.taggingRules.tagOnlyAfterMainCiGreen, true);
  assert.equal(readiness.taggingRules.tagOnlyAfterPagesDeployGreen, true);
  assert.equal(readiness.taggingRules.doNotCallProductionComplete, true);
  assert.equal(readiness.taggingRules.doNotPublishRawSourceTree, true);
  assert.equal(readiness.taggingRules.includeKnownLimitations, true);
  assert.match(changelog, /foundation/i);
});

test('DB Phase 36: db:test terminates at DB36 for this stabilization pack', () => {
  assert.equal(packageJson.scripts['db:gate36'], 'npm run db:gate35 && node --test gates/db-phase-36-foundation-tag-readiness.gate.test.js');
  assert.equal(packageJson.scripts['db:test'], 'npm run db:gate36');
});
