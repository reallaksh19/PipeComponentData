import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { parseSourceText } from '../src/sourceParsers/stagingRows.js';

const read = (file) => fs.readFileSync(file, 'utf8');

test('DB Phase 3: Vlfl count-prefixed CSV becomes raw staging rows', () => {
  const result = parseSourceText('Database/Vlfl/VLV1150.csv', read('data/source-parser-fixtures/vlfl-count-prefixed.csv'));
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.policy.family, 'VALVE');
  assert.equal(result.policy.classRating, '150');
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].sourceRowNumber, 3);
  assert.equal(result.rows[0].raw.nps, '8');
  assert.equal(result.rows[0].raw.rf, '292');
  assert.equal(result.rows[0].raw.kg, '144');
});

test('DB Phase 3: sentinels become null while real zero survives', () => {
  const result = parseSourceText('Database/Vlfl/VLV1150.csv', read('data/source-parser-fixtures/sentinels.csv'));
  const row = result.rows[0].raw;
  assert.equal(row.rf, null);
  assert.equal(row.rtj, null);
  assert.equal(row.kg, '0');
});

test('DB Phase 3: Flan duplicate columns and ignored junk ranges preserve source data by index', () => {
  const result = parseSourceText('Database/Flan/Flg300.csv', read('data/source-parser-fixtures/flan-duplicate-junk.csv'));
  const row = result.rows[0];
  assert.equal(result.policy.rowExplosionRequired, true);
  assert.equal(row.raw.nb, '4');
  assert.equal(row.raw['nb@1'], '100');
  assert.equal(row.raw['hub-a'], '114.3');
  assert.equal(row.ignoredColumns.length, 9);
  assert.equal(row.ignoredColumns[0].index, 45);
  assert.equal(row.ignoredColumns.at(-1).index, 53);
});

test('DB Phase 3: Piwt three-row header starts data at row 4', () => {
  const result = parseSourceText('Database/Piwt/B36-10 2004.csv', read('data/source-parser-fixtures/piwt-three-header.csv'));
  assert.equal(result.policy.family, 'PIPE_AUX');
  assert.equal(result.columns[0].name, 'nps');
  assert.equal(result.rows[0].sourceRowNumber, 4);
  assert.equal(result.rows[0].raw.weight_water_kg_m, '24.28');
});

test('DB Phase 3: unknown source family emits diagnostic instead of throwing', () => {
  const result = parseSourceText('Database/Unknown/file.csv', 'a,b\n1,2\n');
  assert.equal(result.rows.length, 0);
  assert.equal(result.diagnostics[0].code, 'SOURCE_POLICY_MISSING');
});

test('DB Phase 3: parser modules and gate stay under 200 lines', () => {
  for (const file of [
    'src/sourceParsers/csvCells.js',
    'src/sourceParsers/stagingRows.js',
    'gates/db-phase-03-source-parsers.gate.test.js',
  ]) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= 200, `${file} has ${lines} lines`);
  }
});
