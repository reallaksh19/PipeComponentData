import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('data/audit/flange-cl600-wave2-promotion-readiness.json', 'utf8'));
const flanges = JSON.parse(fs.readFileSync('data/normalized/flanges.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));

const rows = fs.readFileSync('docs/Pipedata/Database/Flan/Flg600.csv', 'utf8').trimEnd().split('\n');

test('DB Phase 53: Class 600 flange wave 2 is promotion-ready but not applied', () => {
  assert.equal(manifest.schema, 'pipedata-flange-cl600-wave2-promotion-readiness/v1');
  assert.equal(manifest.phase, 'DB_PHASE_53');
  assert.equal(manifest.status, 'READY_FOR_BOUNDED_PROMOTION_NOT_APPLIED');
  assert.equal(manifest.scope.promotionApplied, false);
  assert.equal(manifest.scope.normalizedDataChanged, false);
  assert.deepEqual(manifest.subtypesAllowedForNextPromotion, ['WN', 'SO', 'BLIND']);
});

test('DB Phase 53: Class 600 source rows match bounded candidate values', () => {
  assert.match(rows[1], /od,thickness,hub-x/);
  for (const candidate of manifest.candidateRows) {
    const line = rows.find((row) => row.startsWith(`${candidate.nps},${candidate.dn},`));
    assert.ok(line, `Missing Flg600 source row for NPS ${candidate.nps}`);
    const cols = line.split(',');
    assert.equal(Number(cols[2]), candidate.flangeOdMm);
    assert.equal(Number(cols[3]), candidate.thicknessMm);
    assert.equal(Number(cols[4]), candidate.hubXMm);
    assert.equal(Number(cols[9]), candidate.soBoreMm);
    assert.equal(Number(cols[18]), candidate.pcdMm);
    assert.equal(Number(cols[19]), candidate.boltCount);
    assert.equal(Number(cols[26]), candidate.wnKg);
    assert.equal(Number(cols[27]), candidate.soKg);
    assert.equal(Number(cols[28]), candidate.blindKg);
  }
});

test('DB Phase 53: current normalized flange boundary remains Class 150 and 300 only', () => {
  assert.equal(flanges.rows.length, 18);
  assert.equal(index.entries.filter((entry) => entry.family === 'FLANGE').length, 18);
  assert.equal(flanges.rows.some((row) => row.classRating === '600'), false);
  assert.equal(index.entries.some((entry) => entry.id.includes('|CL600|')), false);
});

test('DB Phase 53: safety rules block class fallback and fabricated blind values', () => {
  assert.equal(manifest.safetyRules.noNearestClassFallback, true);
  assert.equal(manifest.safetyRules.blindFlangeUnavailableFieldsRemainUnavailable, true);
  assert.equal(manifest.safetyRules.sourceProvenanceRequired, true);
});
