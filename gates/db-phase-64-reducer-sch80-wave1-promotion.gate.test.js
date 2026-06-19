import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const reducer = readJson('data/normalized/reducers-sch80-wave1.json');
const index = readJson('data/indexes/component-search.index.json');
const manifest = readJson('data/exports/db-export-manifest.json');
const catalogs = Object.fromEntries(
  manifest.artifacts.filter((artifact) => artifact.kind === 'NORMALIZED_DATA').map((artifact) => [artifact.path, readJson(artifact.path)]),
);

test('DB Phase 64: reducer SCH80 wave 1 addendum is source-backed', () => {
  assert.equal(reducer.schema, 'pipedata-normalized-reducers/v1');
  assert.equal(reducer.summary.expansionPack, 'DB_PHASE_64_REDUCER_SCH80_WAVE1_PROMOTION');
  assert.equal(reducer.summary.generationMode, 'SOURCE_BACKED_WAVE_1_EXPANSION');
  assert.equal(reducer.summary.sampledRowCount, 6);
  assert.equal(reducer.rows.length, 6);
  assert.equal(reducer.summary.sourceFileCount, 1);
  assert.equal(reducer.summary.sourceRowCount, 25);
  assert.equal(reducer.sourceFiles['docs/Pipedata/Database/Ftbw/Reducers80.csv'], 25);
});

test('DB Phase 64: promoted reducer rows preserve explicit matrix row and column provenance', () => {
  const byId = Object.fromEntries(reducer.rows.map((row) => [row.id, row]));
  const row = byId['REDUCER|UNKNOWN|NPS2|NPS1+1/2|SCH80'];
  assert.equal(row.sourceRowNumber, 10);
  assert.equal(row.largeNps, '2');
  assert.equal(row.smallNps, '1+1/2');
  assert.equal(row.largeSchedule, '80');
  assert.equal(row.smallSchedule, '80');
  assert.equal(row.dimensions.largeEndOdMm.value, 60);
  assert.equal(row.dimensions.largeEndOdMm.sourceColumn, 'od');
  assert.equal(row.dimensions.overallLengthMm.value, 76);
  assert.match(row.dimensions.overallLengthMm.sourceColumn, /Length H/);
  assert.equal(row.weights.weightKg.value, 0.57);
  assert.match(row.weights.weightKg.sourceColumn, /KG/);
  assert.equal(row.provenance.sourceRow, 10);
  assert.equal(row.provenance.source, 'docs/Pipedata/Database/Ftbw/Reducers80.csv');
  assert.equal(row.dataStatus, 'READY');
  assert.equal(row.endType ?? null, null);
});

test('DB Phase 64: every promoted reducer row is indexed and source-resolved', () => {
  const reducerEntries = index.entries.filter((entry) => entry.source === 'data/normalized/reducers-sch80-wave1.json');
  assert.equal(reducerEntries.length, 6);
  for (const row of reducer.rows) {
    const entry = index.entries.find((item) => item.id === row.id);
    assert.ok(entry, `${row.id} missing from search index`);
    assert.equal(entry.source, 'data/normalized/reducers-sch80-wave1.json');
    assert.equal(catalogs[entry.source].rows.some((candidate) => candidate.id === row.id), true);
  }
});

test('DB Phase 64: reducer gate stays under accepted line limit', () => {
  const lines = fs.readFileSync('gates/db-phase-64-reducer-sch80-wave1-promotion.gate.test.js', 'utf8').trimEnd().split('\n').length;
  assert.ok(lines <= 220, `gates/db-phase-64-reducer-sch80-wave1-promotion.gate.test.js has ${lines} lines`);
});
