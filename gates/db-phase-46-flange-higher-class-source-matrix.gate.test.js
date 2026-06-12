import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('data/audit/flange-higher-class-source-matrix.json', 'utf8'));
const flanges = JSON.parse(fs.readFileSync('data/normalized/flanges.json', 'utf8'));
const cl600 = JSON.parse(fs.readFileSync('data/normalized/flanges-cl600-wave2.json', 'utf8'));
const searchIndex = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));
const allRows = [...flanges.rows, ...cl600.rows];

test('DB Phase 46: flange higher-class source matrix remains governance source', () => {
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
  assert.match(rows[1], /od,thickness,hub-x/);
  assert.match(rows.find((line) => line.startsWith('2,50,')), /165,25\.4,84,60\.3/);
  assert.match(rows.find((line) => line.startsWith('4,100,')), /275,38\.1,152,114\.3/);
  assert.match(rows.find((line) => line.startsWith('6,150,')), /355,47\.7,222,168\.3/);
});

test('DB Phase 46: only bounded Class 600 rows are promoted, higher classes remain unpromoted', () => {
  assert.equal(flanges.rows.length, 18);
  assert.equal(cl600.rows.length, 9);
  assert.deepEqual([...new Set(allRows.map((row) => row.classRating))].sort(), ['150', '300', '600']);
  const indexedFlanges = searchIndex.entries.filter((entry) => entry.family === 'FLANGE');
  assert.equal(indexedFlanges.length, 27);
  assert.equal(indexedFlanges.some((entry) => entry.id.includes('|CL600|')), true);
  for (const rating of ['400', '900', '1500', '2500']) {
    assert.equal(indexedFlanges.some((entry) => entry.id.includes(`|CL${rating}|`)), false);
  }
  assert.equal(manifest.safetyRules.noNearestClassFallback, true);
});
