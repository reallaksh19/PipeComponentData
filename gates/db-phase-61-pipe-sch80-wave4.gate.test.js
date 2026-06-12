import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const pipes = readJson('data/normalized/pipes-sch80-wave4.json');
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((artifact) => artifact.kind === 'NORMALIZED_DATA').map((artifact) => [artifact.path, readJson(artifact.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };
const csvRows = fs.readFileSync('docs/Pipedata/Database/Pipe/PIPE80.csv', 'utf8').trimEnd().split('\n');

test('DB Phase 61: bounded SCH80 wave 4 pipe addendum is source-backed', () => {
  assert.equal(pipes.schema, 'pipedata-normalized-pipes/v1');
  assert.equal(pipes.summary.expansionPack, 'DB_PHASE_61_PIPE_SCH80_WAVE4_PROMOTION');
  assert.equal(pipes.summary.generationMode, 'SOURCE_BACKED_WAVE_4_EXPANSION');
  assert.equal(pipes.summary.sampledRowCount, 3);
  assert.equal(pipes.rows.length, 3);
  assert.deepEqual(pipes.rows.map((row) => row.id), ['PIPE|NPS20|SCH80', 'PIPE|NPS22|SCH80', 'PIPE|NPS24|SCH80']);
  assert.match(csvRows[0], /13-NPS/);
});

test('DB Phase 61: promoted SCH80 source values match PIPE80 rows', () => {
  const byId = Object.fromEntries(pipes.rows.map((row) => [row.id, row]));
  assert.equal(byId['PIPE|NPS20|SCH80'].sourceRow, 23);
  assert.equal(byId['PIPE|NPS20|SCH80'].odMm, 508);
  assert.equal(byId['PIPE|NPS20|SCH80'].weightKgPerM, 311.19);
  assert.equal(byId['PIPE|NPS22|SCH80'].sourceRow, 24);
  assert.equal(byId['PIPE|NPS22|SCH80'].momentOfInertiaSource, 167888.36);
  assert.equal(byId['PIPE|NPS24|SCH80'].sourceRow, 25);
  assert.equal(byId['PIPE|NPS24|SCH80'].weightWithWaterKgPerM, 677.91);
  for (const row of pipes.rows) assert.ok(!Object.values(row.valueBasis).includes('FABRICATED'));
  assert.ok(pipes.rows.every((row) => row.dataStatus === 'READY'));
});

test('DB Phase 61: exact lookup resolves wave 4 pipes and rejects wrong schedule or type', () => {
  const found = lookupComponentExact('PIPE 22 SCH80', assets, { filters: { componentType: 'PIPE', nps: '22', schedule: '80' } });
  assert.equal(found.status, LOOKUP_STATUS.FOUND);
  assert.equal(found.row.id, 'PIPE|NPS22|SCH80');
  assert.equal(found.row.source, 'Database/Pipe/PIPE80.csv');
  const wrongSchedule = lookupComponentExact('PIPE 22 SCH160', assets, { filters: { componentType: 'PIPE', nps: '22', schedule: '160' } });
  assert.equal(wrongSchedule.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  const wrongType = lookupComponentExact('PIPE 22 SCH80 WN', assets, { filters: { componentType: 'PIPE', nps: '22', schedule: '80', subtype: 'WN' } });
  assert.equal(wrongType.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  const wrongFamily = lookupComponentExact('FLANGE 22 SCH80', assets, { filters: { componentType: 'FLANGE', nps: '22', schedule: '80' } });
  assert.equal(wrongFamily.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 61: every promoted pipe row is indexed and catalog-resolved', () => {
  const indexed = new Set(index.entries.filter((entry) => entry.family === 'PIPE').map((entry) => entry.id));
  for (const row of pipes.rows) {
    assert.equal(indexed.has(row.id), true, `${row.id} missing from index`);
    assert.equal(index.entries.find((entry) => entry.id === row.id)?.source, 'data/normalized/pipes-sch80-wave4.json');
  }
});

test('DB Phase 61: helper and gate stay under accepted line limit', () => {
  const lines = fs.readFileSync('gates/db-phase-61-pipe-sch80-wave4.gate.test.js', 'utf8').trimEnd().split('\n').length;
  assert.ok(lines <= 220, `gates/db-phase-61-pipe-sch80-wave4.gate.test.js has ${lines} lines`);
});
