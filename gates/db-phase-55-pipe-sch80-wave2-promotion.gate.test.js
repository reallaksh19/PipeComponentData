import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const pipes = readJson('data/normalized/pipes-sch80-wave2.json');
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((artifact) => artifact.kind === 'NORMALIZED_DATA').map((artifact) => [artifact.path, readJson(artifact.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };

test('DB Phase 55: bounded SCH80 wave 2 pipe addendum is source-backed', () => {
  assert.equal(pipes.schema, 'pipedata-normalized-pipes/v1');
  assert.equal(pipes.summary.expansionPack, 'DB_PHASE_55_PIPE_SCH80_WAVE2_PROMOTION');
  assert.equal(pipes.summary.generationMode, 'SOURCE_BACKED_WAVE_2_EXPANSION');
  assert.equal(pipes.rows.length, 3);
  assert.deepEqual(pipes.rows.map((row) => row.id), ['PIPE|NPS8|SCH80', 'PIPE|NPS10|SCH80', 'PIPE|NPS12|SCH80']);
});

test('DB Phase 55: promoted SCH80 source values match PIPE80 rows', () => {
  const byId = Object.fromEntries(pipes.rows.map((row) => [row.id, row]));
  assert.equal(byId['PIPE|NPS8|SCH80'].sourceRow, 17);
  assert.equal(byId['PIPE|NPS8|SCH80'].wallMm, 12.7);
  assert.equal(byId['PIPE|NPS8|SCH80'].weightWithWaterKgPerM, 94.09);
  assert.equal(byId['PIPE|NPS10|SCH80'].idMm, 242.82);
  assert.equal(byId['PIPE|NPS12|SCH80'].momentOfInertiaSource, 19784.22);
  for (const row of pipes.rows) assert.ok(!Object.values(row.valueBasis).includes('FABRICATED'));
});

test('DB Phase 55: exact lookup resolves wave 2 pipes and rejects wrong schedule', () => {
  const found = lookupComponentExact('PIPE 10 SCH80', assets, { filters: { componentType: 'PIPE', nps: '10', schedule: '80' } });
  assert.equal(found.status, LOOKUP_STATUS.FOUND);
  assert.equal(found.row.id, 'PIPE|NPS10|SCH80');
  const wrong = lookupComponentExact('PIPE 10 SCH160', assets, { filters: { componentType: 'PIPE', nps: '10', schedule: '160' } });
  assert.equal(wrong.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
