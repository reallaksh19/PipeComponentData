import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const schema = JSON.parse(fs.readFileSync('data/schemas/reducer.schema.json', 'utf8'));
const readiness = JSON.parse(fs.readFileSync('data/audit/reducer-schema-readiness.json', 'utf8'));
const searchIndex = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));

test('DB Phase 51: reducer canonical schema requires two-size identity', () => {
  assert.equal(schema.title, 'PipeData Reducer Canonical Row');
  assert.equal(schema.properties.componentType.const, 'REDUCER');
  for (const field of ['largeNps', 'smallNps', 'largeSchedule', 'smallSchedule', 'reducerType']) {
    assert.equal(schema.required.includes(field), true, field);
  }
  assert.deepEqual(schema.properties.reducerType.enum, ['CONCENTRIC', 'ECCENTRIC', 'SWAGE', 'UNKNOWN']);
});

test('DB Phase 51: readiness manifest keeps reducer promotion blocked until source mapping', () => {
  assert.equal(readiness.schema, 'pipedata-reducer-schema-readiness/v1');
  assert.equal(readiness.phase, 'DB_PHASE_51');
  assert.equal(readiness.status, 'SCHEMA_READY_NOT_PROMOTED');
  assert.equal(readiness.scope.promotionApplied, false);
  assert.equal(readiness.scope.normalizedDataChanged, false);
  assert.equal(readiness.safetyRules.noReducerPromotionBeforeSchema, true);
  assert.equal(readiness.safetyRules.noSingleNpsReducerRows, true);
});

test('DB Phase 51: no reducer rows are indexed or normalized before promotion gate', () => {
  assert.equal(searchIndex.entries.some((entry) => entry.family === 'REDUCER' || entry.filters?.componentType === 'REDUCER'), false);
  assert.equal(fs.existsSync('data/normalized/reducers.json'), false);
});

test('DB Phase 51: schema and gate stay small', () => {
  for (const path of ['data/schemas/reducer.schema.json', 'gates/db-phase-51-reducer-schema-readiness.gate.test.js']) {
    const lines = fs.readFileSync(path, 'utf8').trimEnd().split('\n').length;
    assert.ok(lines <= 200, `${path} has ${lines} lines`);
  }
});
