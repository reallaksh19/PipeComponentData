import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const json = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const text = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));

test('DB Phase 22: foundation release candidate manifest is conservative', () => {
  const rc = json('data/audit/foundation-release-candidate.json');

  assert.equal(rc.schema, 'pipedata-foundation-release-candidate/v1');
  assert.equal(rc.phase, 'DB_PHASE_22');
  assert.equal(rc.status, 'FOUNDATION_RELEASE_CANDIDATE');
  assert.equal(rc.releaseClass, 'SOURCE_BACKED_FOUNDATION');
  assert.equal(rc.productionComplete, false);
  assert.equal(rc.tagRecommended, 'v0.1.0-foundation');

  assert.equal(rc.policy.exactMatchOnly, true);
  assert.equal(rc.policy.noEngineeringFallback, true);
  assert.equal(rc.policy.noFabricatedEngineeringValues, true);
  assert.equal(rc.policy.missingValues, 'null_or_UNAVAILABLE');
});

test('DB Phase 22: release candidate evidence files exist', () => {
  const rc = json('data/audit/foundation-release-candidate.json');

  for (const file of Object.values(rc.evidence)) {
    assert.equal(exists(file), true, `${file} must exist`);
  }

  assert.ok(rc.requiredBeforeTag.includes('main_ci_green'));
  assert.ok(rc.requiredBeforeTag.includes('pages_deploy_green'));
  assert.ok(rc.requiredBeforeTag.includes('manual_visual_inspection_complete'));
});

test('DB Phase 22: release notes stay in foundation scope', () => {
  const changelog = text('CHANGELOG.md');
  const checklist = text('docs/release-candidate.md');

  assert.match(changelog, /v0\.1\.0-foundation-rc1/);
  assert.match(changelog, /Exact match only/);
  assert.match(checklist, /source-backed foundation/i);
  assert.match(checklist, /Production-complete: no/);
  assert.match(checklist, /lookupComponentExact\(\)/);
});

test('DB Phase 22: public pack and package scripts include the release candidate', () => {
  const pack = json('data/exports/public-export-pack.manifest.json');
  const pkg = json('package.json');
  const paths = new Set(pack.publicArtifacts.map((item) => item.path));

  assert.equal(paths.has('data/audit/foundation-release-candidate.json'), true);
  assert.equal(pkg.scripts['db:gate22'], 'npm run db:gate21 && node --test gates/db-phase-22-release-candidate.gate.test.js');
  assert.equal(pkg.scripts['db:test'], 'npm run db:gate63');
});
