import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildPipeScheduleIndex, lookupPipeScheduleRecord, validatePipeScheduleRows } from '../src/db/pipeScheduleCatalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pipes = readJson('data/normalized/pipes.json');
const pipeIndex = readJson('data/indexes/pipe.index.json');

test('DB Phase 5: normalized pipe schedule inventory is pinned to source tables', () => {
  assert.equal(pipes.schema, 'pipedata-normalized-pipes/v1');
  assert.equal(pipes.summary.sourceRowCount, 489);
  assert.equal(pipes.summary.sourceReadyRows, 384);
  assert.equal(pipes.summary.sourcePartialRows, 105);
  assert.equal(pipes.summary.sampledRowCount, 10);
  assert.equal(pipes.summary.sourceFileCount, 18);
  assert.equal(pipes.summary.sourceFolder, 'Database/Pipe');
  assert.equal(pipes.sourceFiles['Database/Pipe/PIPE40.csv'], 30);
  assert.equal(pipes.sourceFiles['Database/Pipe/PIPE80.csv'], 30);
});

test('DB Phase 5: source values are exact and source-tagged', () => {
  const dataset = { ...pipes, index: pipeIndex };
  const sch40 = lookupPipeScheduleRecord(dataset, { nps: '4', schedule: '40' });
  assert.equal(sch40.ok, true);
  assert.equal(sch40.row.odMm, 114.3);
  assert.equal(sch40.row.wallMm, 6.02);
  assert.equal(sch40.row.weightKgPerM, 16.08);
  assert.equal(sch40.row.source, 'Database/Pipe/PIPE40.csv');
  assert.equal(sch40.row.valueBasis.weightKgPerM, 'SOURCE_VALUE');
  const sch80 = lookupPipeScheduleRecord(dataset, { nps: '4', schedule: '80' });
  assert.equal(sch80.ok, true);
  assert.equal(sch80.row.wallMm, 8.56);
  assert.equal(sch80.row.weightKgPerM, 22.32);
  assert.equal(sch80.row.source, 'Database/Pipe/PIPE80.csv');
});

test('DB Phase 5: partial source rows keep nulls and never coerce blanks to zero', () => {
  const dataset = { ...pipes, index: pipeIndex };
  const hit = lookupPipeScheduleRecord(dataset, { nps: '0+1/8', schedule: '40' });
  assert.equal(hit.ok, true);
  assert.equal(hit.row.dataStatus, 'PARTIAL');
  assert.equal(hit.row.odMm, null);
  assert.equal(hit.row.weightKgPerM, null);
  assert.equal(hit.row.valueBasis.odMm, 'UNAVAILABLE');
});

test('DB Phase 5: pipe index matches normalized rows and has no duplicate keys', () => {
  const generated = buildPipeScheduleIndex(pipes.rows);
  assert.equal(Object.keys(pipeIndex.byKey).length, pipes.summary.sampledRowCount);
  assert.deepEqual(pipeIndex.byKey, generated.byKey);
  assert.equal(pipeIndex.readyKeys.length, 9);
  assert.equal(pipeIndex.partialKeys.length, 1);
  assert.deepEqual(validatePipeScheduleRows(pipes), []);
});

test('DB Phase 5: parser module and gate stay under accepted 300-line limit', () => {
  for (const file of ['src/db/pipeScheduleCatalog.js', 'gates/db-phase-05-pipe-schedules.gate.test.js']) {
    const lines = fs.readFileSync(path.join(root, file), 'utf8').trimEnd().split('\n').length;
    assert.ok(lines <= 300, `${file} has ${lines} lines`);
  }
});

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}
