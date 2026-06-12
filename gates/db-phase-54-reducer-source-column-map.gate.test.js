import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('data/audit/reducer-source-column-map.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('data/schemas/reducer.schema.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));

test('DB Phase 54: reducer source map is ready but rows are not promoted', () => {
  assert.equal(manifest.schema, 'pipedata-reducer-source-column-map/v1');
  assert.equal(manifest.phase, 'DB_PHASE_54');
  assert.equal(manifest.status, 'SOURCE_COLUMN_MAP_READY_NOT_PROMOTED');
  assert.equal(manifest.scope.promotionApplied, false);
  assert.equal(manifest.scope.normalizedDataChanged, false);
});

test('DB Phase 54: reducer canonical schema remains two-size identity', () => {
  for (const field of ['largeNps', 'smallNps', 'largeSchedule', 'smallSchedule', 'reducerType']) {
    assert.ok(manifest.canonicalIdentity.includes(field));
    assert.ok(schema.required.includes(field));
  }
  assert.match(schema.properties.id.pattern, /REDUCER/);
});

test('DB Phase 54: reducer promotion remains blocked until source columns are verified', () => {
  assert.equal(manifest.requiredColumnMappingBeforePromotion.length >= 7, true);
  assert.ok(manifest.blockedPromotions.includes('single-NPS reducer rows'));
  assert.ok(manifest.blockedPromotions.includes('reducer rows indexed as generic fittings'));
  assert.equal(index.entries.some((entry) => entry.family === 'REDUCER'), false);
});

test('DB Phase 54: source family evidence exists but is not enough for promotion', () => {
  const ftbw = manifest.candidateSourceFamilies.find((item) => item.path.endsWith('/Ftbw'));
  assert.equal(ftbw.status, 'SOURCE_FAMILY_PRESENT');
  assert.equal(fs.existsSync(ftbw.path), true);
  assert.equal(manifest.safetyRules.noReducerPromotionBeforeSourceColumnMap, true);
  assert.equal(manifest.safetyRules.noNearestLargeOrSmallNpsFallback, true);
});
