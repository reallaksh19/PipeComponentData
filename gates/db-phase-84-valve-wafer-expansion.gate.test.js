import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupValveRecord } from '../src/db/valveCatalog.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const valves = readJson('data/normalized/valves.json');
const waferValves = readJson('data/normalized/valves-wafer-expanded.json');

test('DB Phase 84: promoted valves contains WAFER_CHECK and BUTTERFLY_WAFER rows', () => {
  assert.equal(valves.metadata.phase, 'DB_PHASE_84');
  assert.ok(valves.rows.length >= 599);

  const checkRows = valves.rows.filter(r => r.valveType === 'WAFER_CHECK');
  assert.equal(checkRows.length, 119);

  const bfyRows = valves.rows.filter(r => r.valveType === 'BUTTERFLY_WAFER');
  assert.equal(bfyRows.length, 35);

  assert.equal(waferValves.rows.length, 154); // 119 + 35 = 154

  // Check endType and facing
  assert.ok(checkRows.every(r => r.endType === 'WAFER' && r.facing === 'NA'));
  assert.ok(bfyRows.every(r => r.endType === 'WAFER' && r.facing === 'NA'));

  // Negative CL400 check
  assert.ok(!checkRows.some(r => r.classRating === '400'));
});

test('DB Phase 84: Wafer Check Valve geometry features', () => {
  const vlv6 = waferValves.rows.find(r => r.id === 'VALVE|WAFER_CHECK|WAFER|NPS2|CL150|NA');
  assert.ok(vlv6);
  assert.equal(vlv6.dimensions.outerDiaMm.value, 104.775);
  assert.equal(vlv6.dimensions.faceToFaceMm.value, 60);
  assert.equal(vlv6.dimensions.innerDiaMm.value, 60.325);
  assert.equal(vlv6.dimensions.boltCount, 4);
  assert.equal(vlv6.weights.waferKg.value, 3);
});

test('DB Phase 84: Butterfly Wafer Valve geometry features', () => {
  const vlv7 = waferValves.rows.find(r => r.id === 'VALVE|BUTTERFLY_WAFER|WAFER|NPS3|CL150|NA');
  assert.ok(vlv7);
  assert.equal(vlv7.dimensions.faceToFaceMm.value, 48);
  assert.equal(vlv7.dimensions.overallHeightMm.value, 254);
  assert.equal(vlv7.dimensions.boltPcdMm.value, 152);
  assert.equal(vlv7.dimensions.boltCount, 4);
  assert.equal(vlv7.weights.waferKg.value, 4.54);
});

test('DB Phase 84: lookups and negative fixtures', () => {
  // Positive lookup WAFER_CHECK
  const hitCheck = lookupValveRecord(valves.rows, { valveType: 'WAFER_CHECK', endType: 'WAFER', nps: '2', classRating: '150', facing: 'NA' });
  assert.equal(hitCheck.ok, true);
  assert.equal(hitCheck.row.id, 'VALVE|WAFER_CHECK|WAFER|NPS2|CL150|NA');

  // Positive lookup BUTTERFLY_WAFER
  const hitBfy = lookupValveRecord(valves.rows, { valveType: 'BUTTERFLY_WAFER', endType: 'WAFER', nps: '3', classRating: '150', facing: 'NA' });
  assert.equal(hitBfy.ok, true);
  assert.equal(hitBfy.row.id, 'VALVE|BUTTERFLY_WAFER|WAFER|NPS3|CL150|NA');

  // Negative fixture 1: CL900 Butterfly is lookup miss
  const missBfy900 = lookupValveRecord(valves.rows, { valveType: 'BUTTERFLY_WAFER', endType: 'WAFER', nps: '2', classRating: '900', facing: 'NA' });
  assert.equal(missBfy900.ok, false);

  // Negative fixture 2: CL400 Wafer Check is lookup miss
  const missCheck400 = lookupValveRecord(valves.rows, { valveType: 'WAFER_CHECK', endType: 'WAFER', nps: '2', classRating: '400', facing: 'NA' });
  assert.equal(missCheck400.ok, false);
});
