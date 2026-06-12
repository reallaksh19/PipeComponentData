import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { componentSearch, SEARCH_MODE } from '../src/db/componentSearch.js';
import { lookupComponentExact, LOOKUP_STATUS } from '../src/db/lookupComponentExact.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const fittings = readJson('data/normalized/fittings.json');
const searchIndex = readJson('data/indexes/component-search.index.json');
const aliases = readJson('data/search/component-aliases.json');
const assets = { searchIndex, aliases, catalogs: { 'data/normalized/fittings.json': fittings } };

test('DB Phase 27: BW fitting catalog promotes bounded source-backed samples only', () => {
  assert.equal(fittings.metadata.phase, 'DB_PHASE_27');
  assert.equal(fittings.metadata.generationMode, 'SOURCE_BACKED_SAMPLE_EXPANSION');
  assert.equal(fittings.metadata.sampledRowCount, 9);
  assert.equal(fittings.rows.length, 9);
  assert.ok(fittings.rows.every((row) => row.datasetVersion === 'pipedata-db/2026.06.dbphase27'));
});

test('DB Phase 27: promoted elbow, tee, and cap rows are source-backed', () => {
  const elbow6 = fittings.rows.find((row) => row.id === 'FITTING|ELBOW_90|NPS6|SCH40|METRIC');
  assert.equal(elbow6.sourceRowNumber, 16);
  assert.equal(elbow6.dimensions.centerToEndMm.value, 229);
  assert.equal(elbow6.weights.weightKg.value, 10.2);
  const tee6 = fittings.rows.find((row) => row.id === 'FITTING|TEE_STRAIGHT|NPS6|SCH40|METRIC');
  assert.equal(tee6.dimensions.branchCenterToEndMm.value, 143);
  const cap6 = fittings.rows.find((row) => row.id === 'FITTING|CAP|NPS6|SCH40|METRIC');
  assert.equal(cap6.dimensions.overCapE1Mm.value, 102);
  assert.ok(fittings.rows.every((row) => row.dataStatus === 'READY'));
});

test('DB Phase 27: fitting lookup remains exact and no nearest-schedule fallback is allowed', () => {
  const hit = lookupComponentExact('ftbw cap 6 sch40', assets, {
    filters: { componentType: 'FITTING', subtype: 'CAP', nps: '6', schedule: '40' },
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.weights.weightKg.value, 3.6);
  const miss = componentSearch('ftbw cap 6 sch80', searchIndex, {
    aliases, mode: SEARCH_MODE.EXACT_ALIAS_ONLY,
    filters: { componentType: 'FITTING', subtype: 'CAP', nps: '6', schedule: '80' },
  });
  assert.equal(miss.ok, false);
});
