import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const backlog = JSON.parse(fs.readFileSync('data/audit/foundation-roadmap-backlog.json', 'utf8'));

test('DB Phase 41: roadmap backlog is present and scoped after foundation stabilization', () => {
  assert.equal(backlog.schema, 'pipedata-foundation-roadmap-backlog/v1');
  assert.equal(backlog.phase, 'DB_PHASE_41');
  assert.equal(backlog.status, 'BACKLOG_READY_FOR_NEXT_PLANNING');
});

test('DB Phase 41: roadmap identifies next data and integration work', () => {
  const ids = backlog.nextWork.map((row) => row.id);
  assert.ok(ids.includes('DATA-PIPE-FULL-SCHEDULES'));
  assert.ok(ids.includes('DATA-FLANGE-MORE-CLASSES'));
  assert.ok(ids.includes('DATA-VALVE-MORE-TYPES'));
  assert.ok(ids.includes('DATA-FITTING-MORE-SCHEDULES'));
  assert.ok(ids.includes('INTEGRATE-GLB-PCF'));
  assert.ok(ids.includes('INTEGRATE-3D-VIEWER'));
});

test('DB Phase 41: blocked work remains explicit', () => {
  const ids = backlog.blockedWork.map((row) => row.id);
  assert.ok(ids.includes('GASKET-NUMERIC-DIMENSIONS'));
  assert.ok(ids.includes('SUPPORT-SPAN-NUMERIC-DATA'));
  assert.ok(ids.includes('OLET-NORMALIZED-CATALOG'));
});

test('DB Phase 41: roadmap keeps global safety rules active', () => {
  assert.equal(backlog.globalRules.noFabricatedEngineeringValues, true);
  assert.equal(backlog.globalRules.noNearestEngineeringFallback, true);
  assert.equal(backlog.globalRules.missingValuesRemainNullOrUnavailable, true);
  assert.equal(backlog.globalRules.sourceProvenanceRequired, true);
});
