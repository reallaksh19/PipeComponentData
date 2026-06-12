import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('data/audit/flange-higher-class-source-matrix.json', 'utf8'));
const flanges = JSON.parse(fs.readFileSync('data/normalized/flanges.json', 'utf8'));
const searchIndex = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));

test('DB Phase 46: flange higher-class source matrix is preflight-only', () => {
  assert.equal(manifest.schema, 'pipedata-flange-higher-class-source-matrix/v1');
  assert.equal(manifest.phase, 'DB_PHASE_46');
  assert.equal(manifest.status, 'SOURCE_MATRIX_READY_NOT_BULK_PROMOTED');
  assert.equal(manifest.scope.promotionApplied, false);
  assert.equal(manifest.scope.normalizedDataChanged, false);
  assert.deepEqual(manifest.alreadyPromotedClasses, ['150', '300']);
});

test('DB Phase 46: candidate source files are declared and Class 600 is bounded-ready', () => {
  assert.equal(manifest.candidateClassFiles.length, 5);
  for (const item of manifest.candidateClassFiles) {
    assert.equal(fs.existsSync(item.path), true, item.path);
  }
  const ready = manifest.candidateClassFiles.find((item) => item.classRating === '600');
  assert.equal(ready.status, 'READY_FOR_BOUNDED_PROMOTION');
});

test('DB Phase 46: Class 600 source rows expose WN/SO/BLIND values for bounded NPS samples', () => {
  const rows = fs.readFileSync('docs/Pipedata/Database/Flan/Flg600.csv', 'utf8').trimEnd().split('\n');
  assert.match(rows[3], /od,thickness,hub-x/);
  assert.match(rows.find((line) => line.startsWith('2,50,')), /165,25\.4,84,60\.3/);
  assert.match(rows.find((line) => line.startsWith('4,100,')), /275,38\.1,152,114\.3/);
  assert.match(rows.find((line) => line.startsWith('6,150,')), /355,47\.7,222,168\.3/);
});

test('DB Phase 46: current normalized flange boundary remains Class 150 and 300 only', () => {
  assert.equal(flanges.rows.length, 18);
  assert.deepEqual([...new Set(flanges.rows.map((row) => row.classRating))].sort(), ['150', '300']);
  const indexedFlanges = searchIndex.entries.filter((entry) => entry.family === 'FLANGE');
  assert.equal(indexedFlanges.length, 18);
  assert.equal(indexedFlanges.some((entry) => entry.id.includes('|CL600|')), false);
  assert.equal(manifest.safetyRules.noNearestClassFallback, true);
});
