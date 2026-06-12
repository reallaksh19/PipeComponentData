import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('data/audit/pipe-schedule-source-matrix.json', 'utf8'));
const pipes = JSON.parse(fs.readFileSync('data/normalized/pipes.json', 'utf8'));
const sch80Wave2 = JSON.parse(fs.readFileSync('data/normalized/pipes-sch80-wave2.json', 'utf8'));
const sch80Wave3 = JSON.parse(fs.readFileSync('data/normalized/pipes-sch80-wave3.json', 'utf8'));
const searchIndex = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));
const allRows = [...pipes.rows, ...sch80Wave2.rows, ...sch80Wave3.rows];

test('DB Phase 45: pipe schedule source matrix remains governance source', () => {
  assert.equal(manifest.schema, 'pipedata-pipe-schedule-source-matrix/v1');
  assert.equal(manifest.phase, 'DB_PHASE_45');
  assert.equal(manifest.status, 'SOURCE_MATRIX_READY_NOT_BULK_PROMOTED');
  assert.equal(manifest.scope.promotionApplied, false);
  assert.equal(manifest.scope.normalizedDataChanged, false);
  assert.equal(manifest.safetyRules.noNearestScheduleFallback, true);
});

test('DB Phase 45: committed PIPE40 and PIPE80 source files are readable and row-counted', () => {
  for (const item of manifest.sourceFiles) {
    const csv = fs.readFileSync(item.path, 'utf8').trimEnd().split('\n');
    assert.equal(csv.length - 1, item.candidateRows, item.path);
    assert.match(csv[0], /13-NPS/);
    assert.match(csv[0], /7-Wt per Unit Len/);
  }
});

test('DB Phase 45: source evidence includes bounded known values and partial rows', () => {
  const pipe40 = fs.readFileSync('docs/Pipedata/Database/Pipe/PIPE40.csv', 'utf8');
  const pipe80 = fs.readFileSync('docs/Pipedata/Database/Pipe/PIPE80.csv', 'utf8');
  assert.match(pipe40, /10,250,273,9\.27,136\.5,254\.46,60\.29/);
  assert.match(pipe40, /22,550,559,N\/A,N\/A,N\/A,N\/A/);
  assert.match(pipe80, /24,600,610,30\.96,305,548\.08,442\.11/);
});

test('DB Phase 45: bounded SCH80 addenda are promoted without bulk schedule import', () => {
  assert.equal(pipes.rows.length, 10);
  assert.equal(sch80Wave2.rows.length, 3);
  assert.equal(sch80Wave3.rows.length, 3);
  const wave4 = JSON.parse(fs.readFileSync('data/normalized/pipes-sch80-wave4.json', 'utf8'));
  assert.equal(wave4.rows.length, 3);
  assert.equal(allRows.find((row) => row.id === 'PIPE|NPS0+1/8|SCH40').dataStatus, 'PARTIAL');
  const indexedPipeRows = searchIndex.entries.filter((entry) => entry.family === 'PIPE');
  assert.equal(indexedPipeRows.length, 18);
  assert.equal(indexedPipeRows.some((entry) => entry.id === 'PIPE|NPS10|SCH40'), false);
  assert.equal(indexedPipeRows.some((entry) => entry.id === 'PIPE|NPS10|SCH80'), true);
  assert.equal(indexedPipeRows.some((entry) => entry.id === 'PIPE|NPS18|SCH80'), true);
  assert.equal(indexedPipeRows.some((entry) => entry.id === 'PIPE|NPS20|SCH80'), true);
  assert.equal(indexedPipeRows.some((entry) => entry.id === 'PIPE|NPS24|SCH80'), true);
  assert.equal(allRows.some((row) => String(row.schedule) === '160'), false);
});
