import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildPipeScheduleIndex,
  lookupPipeScheduleRecord,
  validatePipeScheduleRows,
} from '../src/db/pipeScheduleCatalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pipes = readJson('data/normalized/pipes.json');
const pipeIndex = readJson('data/indexes/pipe.index.json');

test('DB Phase 5: normalized pipe schedule inventory is pinned to source tables', () => {
  assert.equal(pipes.schema, 'pipedata-normalized-pipes/v1');
  assert.equal(pipes.summary.sourceRowCount, 489);
  assert.equal(pipes.summary.sourceReadyRows, 384);
  assert.equal(pipes.summary.sourcePartialRows, 105);
  assert.equal(pipes.summary.sampledRowCount, 5);
  assert.equal(pipes.summary.sourceFileCount, 18);
  assert.equal(pipes.summary.sourceFolder, 'Database/Pipe');
  assert.equal(pipes.sourceFiles['Database/Pipe/PIPE40.csv'], 30);
});

test('DB Phase 5: 4 inch Sch 40 source values are exact and source-tagged', () => {
  const dataset = { ...pipes, index: pipeIndex };
  const hit = lookupPipeScheduleRecord(dataset, { nps: '4', schedule: '40' });
  assert.equal(hit.ok, true);
  assert.equal(hit.row.odMm, 114.3);
  assert.equal(hit.row.wallMm, 6.02);
  assert.equal(hit.row.idMm, 102.26);
  assert.equal(hit.row.weightKgPerM, 16.08);
  assert.equal(hit.row.weightWithWaterKgPerM, 24.28);
  assert.equal(hit.row.momentOfInertiaSource, 300.89);
  assert.equal(hit.row.source, 'Database/Pipe/PIPE40.csv');
  assert.equal(hit.row.valueBasis.weightKgPerM, 'SOURCE_VALUE');
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
  assert.equal(pipeIndex.readyKeys.length, 4);
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
