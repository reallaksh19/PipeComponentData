import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as publicApi from '../src/index.js';

const manifestPath = 'data/exports/public-export-pack.manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const artifactPaths = manifest.publicArtifacts.map((artifact) => artifact.path);
const pagesPaths = manifest.publicArtifacts.map((artifact) => artifact.pagesPath);
const forbiddenPrefixes = manifest.forbiddenArtifacts.map((artifact) => artifact.path);

test('DB Phase 17: public export pack declares safety policy', () => {
  assert.equal(manifest.schema, 'pipedata-public-export-pack/v1');
  assert.equal(manifest.phase, 'DB_PHASE_17');
  assert.equal(manifest.policy.exactMatchOnly, true);
  assert.equal(manifest.policy.noEngineeringFallback, true);
  assert.equal(manifest.policy.rawSourceTreePublished, false);
  assert.equal(manifest.policy.missingValues, 'null_or_UNAVAILABLE');
  assert.equal(manifest.policy.provenanceRequired, true);
});

test('DB Phase 17: every public artifact is readable and raw-source safe', () => {
  assert.ok(artifactPaths.includes('data/exports/db-export-manifest.json'));
  assert.ok(artifactPaths.includes('data/audit/db-coverage-dashboard.json'));
  assert.ok(artifactPaths.includes('data/indexes/component-search.index.json'));
  assert.ok(artifactPaths.includes('data/search/component-aliases.json'));

  for (const artifact of manifest.publicArtifacts) {
    assert.ok(artifact.path);
    assert.ok(artifact.pagesPath);
    assert.ok(artifact.kind);
    assert.ok(artifact.family);
    assert.ok(fs.existsSync(artifact.path), `${artifact.path} is missing`);
    assert.doesNotMatch(artifact.path, /^docs\/Pipedata\/Database/);
    assert.doesNotMatch(artifact.pagesPath, /^docs\/Pipedata\/Database/);
  }
});

test('DB Phase 17: public API symbols are exported by package entrypoint', () => {
  for (const symbol of manifest.publicApis) {
    assert.ok(symbol.export in publicApi, `${symbol.export} is not exported`);
    if (symbol.kind === 'function') assert.equal(typeof publicApi[symbol.export], 'function');
    if (symbol.kind === 'constant') assert.equal(typeof publicApi[symbol.export], 'object');
  }
});

test('DB Phase 17: Pages workflow publishes only approved public paths', () => {
  const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /mkdir -p .*_site\/data\/exports/);
  assert.match(workflow, /cp data\/exports\/\*\.json _site\/data\/exports\//);
  assert.match(workflow, /test -f _site\/data\/exports\/public-export-pack\.manifest\.json/);
  assert.match(workflow, /Raw source database tree must not be published to Pages/);
  assert.ok(pagesPaths.every((path) => !path.startsWith('docs/Pipedata/Database')));
});

test('DB Phase 17: forbidden artifacts are explicit and not public', () => {
  assert.deepEqual(forbiddenPrefixes, ['docs/Pipedata/Database']);
  for (const artifact of manifest.publicArtifacts) {
    for (const forbidden of forbiddenPrefixes) {
      assert.ok(!artifact.path.startsWith(forbidden), artifact.path);
    }
  }
});
