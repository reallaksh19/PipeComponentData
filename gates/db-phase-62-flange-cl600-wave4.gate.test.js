import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/index.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const flanges = readJson('data/normalized/flanges-cl600-wave4.json');
const index = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((artifact) => artifact.kind === 'NORMALIZED_DATA').map((artifact) => [artifact.path, readJson(artifact.path)]),
);
const assets = { searchIndex: index, aliases, catalogs };
const csvRows = fs.readFileSync('docs/Pipedata/Database/Flan/Flg600.csv', 'utf8').trimEnd().split('\n');

test('DB Phase 62: bounded Class 600 wave 4 flange addendum is source-backed', () => {
  assert.equal(flanges.schema, 'pipedata-normalized-flanges/v1');
  assert.equal(flanges.summary.expansionPack, 'DB_PHASE_62_FLANGE_CL600_WAVE4_PROMOTION');
  assert.equal(flanges.summary.generationMode, 'SOURCE_BACKED_WAVE_4_EXPANSION');
  assert.equal(flanges.summary.sampledRowCount, 21);
  assert.equal(flanges.rows.length, 21);
  assert.deepEqual([...new Set(flanges.rows.map((row) => row.nps))], ['12', '14', '16', '18', '20', '22', '24']);
  assert.match(csvRows[1], /od,thickness,hub-x/);
});

test('DB Phase 62: promoted Class 600 source values match Flg600 rows', () => {
  const byId = Object.fromEntries(flanges.rows.map((row) => [row.id, row]));
  assert.equal(byId['FLANGE|WN|NPS12|CL600|METRIC'].sourceRow, 19);
  assert.equal(byId['FLANGE|WN|NPS12|CL600|METRIC'].weightKg, 102);
  assert.equal(byId['FLANGE|SO|NPS20|CL600|METRIC'].soBoreMm, 513.1);
  assert.equal(byId['FLANGE|BLIND|NPS24|CL600|METRIC'].blindThicknessMm, 101.6);
  assert.equal(byId['FLANGE|BLIND|NPS24|CL600|METRIC'].valueBasis.hubXMm, 'UNAVAILABLE');
  assert.equal(byId['FLANGE|WN|NPS22|CL600|METRIC'].dataStatus, 'PARTIAL');
  assert.equal(byId['FLANGE|WN|NPS22|CL600|METRIC'].flangeOdMm, null);
  assert.equal(byId['FLANGE|WN|NPS22|CL600|METRIC'].valueBasis.weightKg, 'UNAVAILABLE');
  for (const row of flanges.rows) assert.ok(!Object.values(row.valueBasis).includes('FABRICATED'));
});

test('DB Phase 62: exact lookup resolves wave 4 CL600 and rejects wrong class or type', () => {
  const found = lookupComponentExact('FLG600 22 WN', assets, { filters: { componentType: 'FLANGE', subtype: 'WN', nps: '22', classRating: '600' } });
  assert.equal(found.status, LOOKUP_STATUS.FOUND);
  assert.equal(found.row.id, 'FLANGE|WN|NPS22|CL600|METRIC');
  assert.equal(found.row.source, 'docs/Pipedata/Database/Flan/Flg600.csv');
  assert.equal(found.row.dataStatus, 'PARTIAL');
  const wrongClass = lookupComponentExact('FLG900 22 WN', assets, { filters: { componentType: 'FLANGE', subtype: 'WN', nps: '22', classRating: '900' } });
  assert.equal(wrongClass.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  const wrongType = lookupComponentExact('FLG600 22 CAP', assets, { filters: { componentType: 'FLANGE', subtype: 'CAP', nps: '22', classRating: '600' } });
  assert.equal(wrongType.status, LOOKUP_STATUS.NO_EXACT_MATCH);
  const wrongFamily = lookupComponentExact('PIPE 22 SCH80 WN', assets, { filters: { componentType: 'PIPE', nps: '22', schedule: '80', subtype: 'WN' } });
  assert.equal(wrongFamily.status, LOOKUP_STATUS.NO_EXACT_MATCH);
});

test('DB Phase 62: every promoted flange row is indexed and catalog-resolved', () => {
  const indexed = new Set(index.entries.filter((entry) => entry.family === 'FLANGE').map((entry) => entry.id));
  for (const row of flanges.rows) {
    assert.equal(indexed.has(row.id), true, `${row.id} missing from index`);
    assert.equal(index.entries.find((entry) => entry.id === row.id)?.source, 'data/normalized/flanges-cl600-wave4.json');
  }
});

test('DB Phase 62: helper and gate stay under accepted line limit', () => {
  const lines = fs.readFileSync('gates/db-phase-62-flange-cl600-wave4.gate.test.js', 'utf8').trimEnd().split('\n').length;
  assert.ok(lines <= 220, `gates/db-phase-62-flange-cl600-wave4.gate.test.js has ${lines} lines`);
});
