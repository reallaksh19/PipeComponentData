import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const pipes = readJson('data/normalized/pipes-sch80-wave3.json');
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((artifact) => artifact.kind === 'NORMALIZED_DATA').map((artifact) => [artifact.path, readJson(artifact.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };

test('DB Phase 58: bounded SCH80 wave 3 pipe addendum is source-backed', () => {
  assert.equal(pipes.schema, 'pipedata-normalized-pipes/v1');
  assert.equal(pipes.summary.expansionPack, 'DB_PHASE_58_PIPE_SCH80_WAVE3_PROMOTION');
  assert.equal(pipes.summary.generationMode, 'SOURCE_BACKED_WAVE_3_EXPANSION');
  assert.deepEqual(pipes.rows.map((row) => row.id), ['PIPE|NPS14|SCH80', 'PIPE|NPS16|SCH80', 'PIPE|NPS18|SCH80']);
});

test('DB Phase 58: promoted SCH80 source values match PIPE80 rows', () => {
  const byId = Object.fromEntries(pipes.rows.map((row) => [row.id, row]));
  assert.equal(byId['PIPE|NPS14|SCH80'].sourceRow, 20);
  assert.equal(byId['PIPE|NPS14|SCH80'].wallMm, 19.05);
  assert.equal(byId['PIPE|NPS16|SCH80'].idMm, 363.52);
  assert.equal(byId['PIPE|NPS18|SCH80'].momentOfInertiaSource, 76251.99);
  for (const row of pipes.rows) assert.ok(!Object.values(row.valueBasis).includes('FABRICATED'));
});

test('DB Phase 58: exact lookup resolves wave 3 pipes and rejects wrong schedule', () => {
  const found = lookupComponentExact('PIPE 16 SCH80', assets, { filters: { componentType: 'PIPE', nps: '16', schedule: '80' } });
  assert.equal(found.status, LOOKUP_STATUS.FOUND);
  assert.equal(found.row.id, 'PIPE|NPS16|SCH80');
  const wrong = lookupComponentExact('PIPE 16 SCH160', assets, { filters: { componentType: 'PIPE', nps: '16', schedule: '160' } });
  assert.equal(wrong.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});
