import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupValveRecord } from '../src/db/valveCatalog.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const valves = readJson('data/normalized/valves.json');
const controlValves = readJson('data/normalized/valves-control-expanded.json');

test('DB Phase 82: promoted valves contains CONTROL rows', () => {
  assert.ok(['DB_PHASE_82', 'DB_PHASE_83', 'DB_PHASE_84'].includes(valves.metadata.phase));
  assert.ok(valves.rows.length >= 312);

  const controlRows = valves.rows.filter(r => r.valveType === 'CONTROL');
  assert.equal(controlRows.length, 90);
  assert.equal(controlValves.rows.length, 90);

  // Negative CL400 check
  const hasCl400 = controlRows.some(r => r.classRating === '400');
  assert.ok(!hasCl400);
});

test('DB Phase 82: Control Valve unit conversion fixes (CL300+ vs CL150)', () => {
  // CL150 NPS 1 control valve (should be mm as-is: 184.15)
  const cl150Nps1 = controlValves.rows.find(r => r.nps === '1' && r.classRating === '150');
  assert.ok(cl150Nps1);
  assert.equal(cl150Nps1.dimensions.faceToFaceRfMm.value, 184.15);

  // CL300 NPS 1 control valve (should be converted: 7.625 * 25.4 = 193.675)
  const cl300Nps1 = controlValves.rows.find(r => r.nps === '1' && r.classRating === '300');
  assert.ok(cl300Nps1);
  assert.equal(cl300Nps1.dimensions.faceToFaceRfMm.value.toFixed(3), '193.675');
});

test('DB Phase 82: lookups and negative fixtures', () => {
  // Positive lookup CONTROL
  const hitControl = lookupValveRecord(valves.rows, { valveType: 'CONTROL', endType: 'FLANGED', nps: '1', classRating: '150', facing: 'RF' });
  assert.equal(hitControl.ok, true);
  assert.equal(hitControl.row.id, 'VALVE|CONTROL|FLANGED|NPS1|CL150|RF');

  // Negative fixture: CL400 Control is lookup miss
  const missControl400 = lookupValveRecord(valves.rows, { valveType: 'CONTROL', endType: 'FLANGED', nps: '1', classRating: '400', facing: 'RF' });
  assert.equal(missControl400.ok, false);
});
