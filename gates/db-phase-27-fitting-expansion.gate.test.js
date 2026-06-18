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
  assert.equal(fittings.metadata.phase, 'DB_PHASE_50');
  assert.equal(fittings.metadata.generationMode, 'SOURCE_BACKED_WAVE_1_EXPANSION');
  assert.equal(fittings.metadata.sampledRowCount, 15);
  assert.equal(fittings.rows.length, 15);
  assert.ok(fittings.metadata.sourceFiles.includes('docs/Pipedata/Database/Ftbw/45Elbow40.csv'));
  assert.ok(fittings.metadata.sourceFiles.includes('docs/Pipedata/Database/Ftbw/90Elbow80.csv'));
});

test('DB Phase 27: promoted elbow, tee, cap and wave rows are source-backed', () => {
  const elbow6 = fittings.rows.find((row) => row.id === 'FITTING|ELBOW_90|NPS6|SCH40|METRIC');
  assert.equal(elbow6.sourceRowNumber, 16);
  assert.equal(elbow6.dimensions.centerToEndMm.value, 229);
  assert.equal(elbow6.weights.weightKg.value, 10.2);
  const elbow45 = fittings.rows.find((row) => row.id === 'FITTING|ELBOW_45|NPS4|SCH40|METRIC');
  assert.equal(elbow45.dimensions.radiusMm.value, 151.60625);
  assert.equal(elbow45.weights.weightKg.value, 1.95);
  const elbow80 = fittings.rows.find((row) => row.id === 'FITTING|ELBOW_90|NPS4|SCH80|METRIC');
  assert.equal(elbow80.dimensions.centerToEndMm.value, 152);
  assert.equal(elbow80.weights.weightKg.value, 5.4);
  assert.ok(fittings.rows.every((row) => row.dataStatus === 'READY'));
});

test('DB Phase 27: fitting lookup remains exact and no nearest-schedule fallback is allowed', () => {
  const hit = lookupComponentExact('90 elbow 4 schedule 80', assets, {
    filters: { componentType: 'FITTING', subtype: 'ELBOW_90', nps: '4', schedule: '80' },
  });
  assert.equal(hit.status, LOOKUP_STATUS.FOUND);
  assert.equal(hit.row.weights.weightKg.value, 5.4);
  const miss = componentSearch('ftbw cap 6 sch80', searchIndex, {
    aliases, mode: SEARCH_MODE.EXACT_ALIAS_ONLY,
    filters: { componentType: 'FITTING', subtype: 'CAP', nps: '6', schedule: '80' },
  });
  assert.equal(miss.ok, false);
});
