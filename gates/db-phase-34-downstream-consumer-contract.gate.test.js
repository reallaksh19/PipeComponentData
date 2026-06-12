import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const contract = JSON.parse(fs.readFileSync('data/exports/downstream-consumer-contract.json', 'utf8'));
const apiSurface = JSON.parse(fs.readFileSync('contracts/api-surface.json', 'utf8'));
const publicPack = JSON.parse(fs.readFileSync('data/exports/public-export-pack.manifest.json', 'utf8'));
const dts = fs.readFileSync('src/index.d.ts', 'utf8');

function publicArtifactPaths() {
  return new Set(publicPack.publicArtifacts.map((item) => item.path));
}

test('DB Phase 34: downstream contract names only stable public APIs', () => {
  assert.equal(contract.schema, 'pipedata-downstream-consumer-contract/v1');
  assert.equal(contract.phase, 'DB_PHASE_34');
  assert.deepEqual(contract.stableApis, ['lookupComponentExact', 'LOOKUP_STATUS']);

  for (const api of contract.stableApis) {
    assert.equal(apiSurface.exports.includes(api), true, `${api} missing from API surface`);
    assert.match(dts, new RegExp(`\\b${api}\\b`), `${api} missing from declarations`);
  }
});

test('DB Phase 34: downstream contract forbids internal/raw/fallback integration paths', () => {
  assert.equal(contract.integrationRules.usePublicApiOnly, true);
  assert.equal(contract.integrationRules.doNotCallInternalComponentSearch, true);
  assert.equal(contract.integrationRules.doNotReadRawSourceTree, true);
  assert.equal(contract.integrationRules.doNotInferMissingDimensions, true);
  assert.equal(contract.integrationRules.respectNoExactMatch, true);
  assert.equal(contract.integrationRules.respectMissingDimensionStatus, true);
  assert.deepEqual(contract.forbiddenPaths, ['docs/Pipedata/Database']);
});

test('DB Phase 34: downstream required artifacts are public and present', () => {
  const published = publicArtifactPaths();
  for (const path of contract.requiredPublicArtifacts) {
    assert.equal(fs.existsSync(path), true, `${path} missing`);
    assert.equal(published.has(path), true, `${path} not in public export pack`);
  }
});
