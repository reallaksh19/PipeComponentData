import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupValveRecord } from '../src/db/valveCatalog.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const valves = readJson('data/normalized/valves.json');
const swingcheckValves = readJson('data/normalized/valves-swingcheck-expanded.json');

test('DB Phase 83: promoted valves contains SWING_CHECK rows', () => {
  assert.ok(['DB_PHASE_83', 'DB_PHASE_84'].includes(valves.metadata.phase));
  assert.ok(valves.rows.length >= 445);

  const swingRows = valves.rows.filter(r => r.valveType === 'SWING_CHECK');
  assert.equal(swingRows.length, 133);
  assert.equal(swingcheckValves.rows.length, 133);

  // Negative CL400 check
  const hasCl400 = swingRows.some(r => r.classRating === '400');
  assert.ok(!hasCl400);
});

test('DB Phase 83: Swing Check Valve geometry features', () => {
  // Check that handwheelDiaMm is unavailable/null
  const vlv2 = swingcheckValves.rows.find(r => r.id === 'VALVE|SWING_CHECK|FLANGED|NPS2|CL150|RF');
  assert.ok(vlv2);
  assert.equal(vlv2.dimensions.handwheelDiaMm.value, null);
  assert.equal(vlv2.dimensions.handwheelDiaMm.basis, 'UNAVAILABLE');

  // Check that buttWeldShortMm is present for NPS 2 (it is defined as 203 in VLV5150 row index 10)
  assert.equal(vlv2.dimensions.heightMm.value, 165);
  assert.equal(vlv2.dimensions.buttWeldShortMm.value, 203);
  assert.equal(vlv2.dimensions.buttWeldShortMm.basis, 'SOURCE_VALUE');
});

test('DB Phase 83: lookups and negative fixtures', () => {
  // Positive lookup SWING_CHECK
  const hitSwing = lookupValveRecord(valves.rows, { valveType: 'SWING_CHECK', endType: 'FLANGED', nps: '2', classRating: '150', facing: 'RF' });
  assert.equal(hitSwing.ok, true);
  assert.equal(hitSwing.row.id, 'VALVE|SWING_CHECK|FLANGED|NPS2|CL150|RF');

  // Negative fixture: CL400 Swing Check is lookup miss
  const missSwing400 = lookupValveRecord(valves.rows, { valveType: 'SWING_CHECK', endType: 'FLANGED', nps: '2', classRating: '400', facing: 'RF' });
  assert.equal(missSwing400.ok, false);
});
