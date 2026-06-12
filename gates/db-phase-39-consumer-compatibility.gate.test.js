import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const matrix = JSON.parse(fs.readFileSync('data/audit/consumer-compatibility-matrix.json', 'utf8'));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('DB Phase 39: compatibility matrix declares package baseline', () => {
  assert.equal(matrix.schema, 'pipedata-consumer-compatibility-matrix/v1');
  assert.equal(matrix.phase, 'DB_PHASE_39');
  assert.equal(matrix.package.name, packageJson.name);
  assert.equal(matrix.package.moduleType, 'esm');
  assert.equal(matrix.package.nodeMinimum, '20');
  assert.equal(matrix.package.types, packageJson.types);
});

test('DB Phase 39: supported consumers are declared for foundation integrations', () => {
  const consumers = matrix.supportedConsumers.map((row) => row.consumer);
  assert.ok(consumers.includes('Studio Pages UI'));
  assert.ok(consumers.includes('GLB-PCF-2.5-Editor'));
  assert.ok(consumers.includes('3D_Viewer'));
});

test('DB Phase 39: compatibility rules use only public exact lookup API', () => {
  assert.deepEqual(matrix.publicApi, ['lookupComponentExact', 'LOOKUP_STATUS']);
  assert.equal(matrix.rules.publicApiOnly, true);
  assert.equal(matrix.rules.doNotUseInternalSearchHelpers, true);
  assert.equal(matrix.rules.doNotReadRawSourceTree, true);
  assert.equal(matrix.rules.honorNoExactMatch, true);
  assert.equal(matrix.rules.honorMissingDimension, true);
});
