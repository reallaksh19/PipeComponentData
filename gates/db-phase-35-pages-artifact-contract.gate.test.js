import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const contract = JSON.parse(fs.readFileSync('data/audit/pages-artifact-contract.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');

function workflowContains(text) {
  return workflow.includes(text);
}

test('DB Phase 35: Pages artifact contract records minimal public artifact policy', () => {
  assert.equal(contract.schema, 'pipedata-pages-artifact-contract/v1');
  assert.equal(contract.phase, 'DB_PHASE_35');
  assert.equal(contract.publishRoot, '_site');
  assert.equal(contract.cachePolicy.cacheBustStudioCssAndJs, true);
});

test('DB Phase 35: Pages workflow copies required public artifact groups', () => {
  for (const policy of contract.requiredCopyPolicies) {
    if (policy === 'studio') assert.equal(workflowContains('cp -R studio/. _site/studio/'), true);
    if (policy === 'data/indexes/component-search.index.json') assert.equal(workflowContains('component-search.index.json'), true);
    if (policy === 'data/search/component-aliases.json') assert.equal(workflowContains('component-aliases.json'), true);
    if (policy === 'data/normalized/*.json') assert.equal(workflowContains('cp data/normalized/*.json'), true);
    if (policy === 'data/exports/*.json') assert.equal(workflowContains('cp data/exports/*.json'), true);
    if (policy === 'data/audit/*.json') assert.equal(workflowContains('cp data/audit/*.json'), true);
  }
});

test('DB Phase 35: required public artifacts exist and raw database is forbidden', () => {
  for (const path of contract.requiredPublishedArtifacts) {
    const repoPath = path.replace(/^studio\//, 'studio/');
    assert.equal(fs.existsSync(repoPath), true, `${repoPath} missing`);
  }

  assert.deepEqual(contract.forbiddenPublishedPaths, ['docs/Pipedata/Database']);
  assert.equal(workflowContains('Raw source database tree must not be published'), true);
  assert.equal(workflowContains('_site/docs/Pipedata/Database'), true);
});
