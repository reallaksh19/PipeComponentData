import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const lineCount = (path) => read(path).split('\n').length;
const indexPath = 'pipetools/data/db-index.json';
const loaderPath = 'pipetools/js/db/dbIndex.js';
const manifestPath = 'data/audit/pipetools-agent-16-db-index-manifest.json';
const gatePath = 'gates/pipetools-agent-16-db-index.gate.test.js';
const completeManifestPath = 'data/audit/pipetools-agent-22-complete-db-index-manifest.json';
const expectedFamilies = ['PIPE', 'VALVE', 'FLANGE', 'FITTING', 'GASKET', 'SUPPORT', 'REDUCER', 'OLET'];

const entryPaths = (entry) => (entry.repositoryPaths ?? [entry.repositoryPath]).filter(Boolean);
const runtimeUrls = (entry) => (entry.runtimeUrls ?? [entry.runtimeUrl]).filter(Boolean);

function declaredRows(paths) {
  return paths.reduce((sum, path) => sum + Number(json(path).rows?.length ?? 0), 0);
}

function completeManifestFamilies() {
  return json(completeManifestPath).families ?? {};
}

test('Agent 16 DB index files exist and stay small', () => {
  for (const path of [indexPath, loaderPath, manifestPath, gatePath]) {
    assert.ok(existsSync(path), `${path} missing`);
  }
  assert.ok(lineCount(loaderPath) <= 200, `${loaderPath} exceeds 200 lines`);
  assert.ok(lineCount(gatePath) <= 200, `${gatePath} exceeds 200 lines`);
});

test('DB index covers every PipeTools DB family', () => {
  const index = json(indexPath);
  assert.equal(index.schema, 'pipetools-db-index/v2');
  const families = index.families.map((entry) => entry.family).sort();
  assert.deepEqual(families, [...expectedFamilies].sort());
});

test('DB index points to existing normalized DB packs with declared complete row counts', () => {
  const manifestFamilies = completeManifestFamilies();
  for (const entry of json(indexPath).families) {
    const paths = entryPaths(entry);
    assert.ok(paths.length >= 1, `${entry.family} repository paths missing`);
    for (const path of paths) {
      assert.ok(existsSync(path), `${path} missing`);
      assert.ok(Array.isArray(json(path).rows), `${path} rows missing`);
    }
    assert.ok(declaredRows(paths) >= entry.rowCount, `${entry.family} rowCount exceeds declared source rows`);
    assert.equal(entry.rowCount, manifestFamilies[entry.family]?.indexedRows, `${entry.family} manifest rowCount mismatch`);
    for (const url of runtimeUrls(entry)) assert.ok(url.includes('../data/normalized/'), `${entry.family} runtime URL is not normalized DB`);
    assert.equal(entry.sourceRowCount, entry.rowCount, `${entry.family} should have zero pending rows`);
    assert.ok(entry.sourceFileCount >= 1, `${entry.family} sourceFileCount missing`);
  }
});

test('DB index entries expose schema fields for dashboard generation', () => {
  for (const entry of json(indexPath).families) {
    assert.equal(entry.componentType, entry.family);
    assert.ok(entry.label, `${entry.family} label missing`);
    assert.ok(entry.standard, `${entry.family} standard missing`);
    assert.ok(entry.subtypes.length >= 1, `${entry.family} subtypes missing`);
    assert.ok(entry.keyFields.length >= 2, `${entry.family} keyFields missing`);
    assert.ok(entry.searchFields.includes('id'), `${entry.family} searchFields must include id`);
    assert.ok(entry.availableFilters.includes('dataStatus'), `${entry.family} filters must include dataStatus`);
  }
});

test('index preserves required source-specific component routing markers', () => {
  const byFamily = Object.fromEntries(json(indexPath).families.map((entry) => [entry.family, entry]));
  assert.ok(byFamily.VALVE.subtypes.includes('GATE'));
  assert.ok(byFamily.VALVE.subtypes.includes('CONTROL'));
  assert.ok(byFamily.FITTING.subtypes.includes('ELBOW_45'));
  assert.ok(byFamily.FLANGE.subtypes.includes('BLIND'));
  assert.ok(byFamily.REDUCER.subtypes.includes('ECCENTRIC'));
  assert.ok(byFamily.OLET.subtypes.includes('ELBOLET'));
  assert.equal(byFamily.SUPPORT.svgSupported, false);
});

test('CI workflows preserve Agent 16 cumulative DB index gate', () => {
  const ci = read('.github/workflows/pipetools-ci.yml');
  const pages = read('.github/workflows/pages.yml');
  assert.ok(ci.includes('pipetools-agent-16-db-index.gate.test.js'));
  assert.ok(pages.includes('pipetools-agent-16-db-index.gate.test.js'));
  assert.ok(pages.includes('_site/pipetools/data/db-index.json'));
});
