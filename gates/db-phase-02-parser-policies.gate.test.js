import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  cleanSentinel,
  getParserPolicyForPath,
  inferClassFromFilename,
  inferUnitSystemFromFilename,
  isIgnoredColumn,
  requiresRowExplosion,
} from '../src/sourceParsers/parserPolicy.js';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const policies = readJson('data/parser-policies/parser-policies.json');

test('DB Phase 2: per-family header policies are explicit', () => {
  const fixtures = readJson('data/parser-policies/header-policy-fixtures.json').cases;
  for (const item of fixtures) {
    const policy = getParserPolicyForPath(item.source, policies);
    assert.equal(policy.headerPolicy.type, item.type, item.source);
    assert.equal(policy.headerPolicy.headerRows, item.headerRows, item.source);
    assert.equal(policy.headerPolicy.dataStartsAtRow, item.dataStartsAtRow, item.source);
  }
});

test('DB Phase 2: filename class parsing uses longest-match fixtures', () => {
  const fixtures = readJson('data/parser-policies/filename-class-fixtures.json').cases;
  for (const item of fixtures) {
    assert.equal(inferClassFromFilename(item.filename, policies), item.expectedClass, item.filename);
    assert.equal(inferUnitSystemFromFilename(item.filename), item.expectedUnitSystem, item.filename);
  }
});

test('DB Phase 2: sentinels become null and real values survive', () => {
  const fixtures = readJson('data/parser-policies/sentinel-fixtures.json').cases;
  for (const item of fixtures) {
    assert.equal(cleanSentinel(item.raw, policies), item.expected, JSON.stringify(item.raw));
  }
});

test('DB Phase 2: column policy flags source quirks before parsing', () => {
  const fixtures = readJson('data/parser-policies/column-policy-fixtures.json').cases;
  for (const item of fixtures) {
    const policy = getParserPolicyForPath(item.source, policies);
    assert.equal(policy.columnPolicy.duplicateNamesAllowed, item.duplicateNamesAllowed, item.source);
    assert.equal(requiresRowExplosion(policy), item.rowExplosionRequired, item.source);
    if (item.requiresDeclaredPrecedence) assert.ok(policy.precedence?.rule, item.source);
  }
  const flange = getParserPolicyForPath('Database/Flan/Flg300.csv', policies);
  assert.ok(isIgnoredColumn(flange, 45));
  assert.ok(isIgnoredColumn(flange, 53));
  assert.equal(isIgnoredColumn(flange, 54), false);
});

test('DB Phase 2: parser policy modules and gates stay under 200 lines', () => {
  const files = [
    'src/sourceParsers/parserPolicy.js',
    'gates/db-phase-02-parser-policies.gate.test.js',
  ];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= 200, `${file} has ${lines} lines`);
  }
  assert.ok(path.sep);
});
