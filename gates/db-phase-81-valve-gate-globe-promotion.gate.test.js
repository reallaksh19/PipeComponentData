import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lookupValveRecord } from '../src/db/valveCatalog.js';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const valves = readJson('data/normalized/valves.json');
const index = readJson('data/indexes/valve.index.json');

test('DB Phase 81: promoted valves contains GATE and GLOBE rows', () => {
  assert.ok(['DB_PHASE_81', 'DB_PHASE_82', 'DB_PHASE_83', 'DB_PHASE_84'].includes(valves.metadata.phase));
  assert.ok(valves.rows.length >= 222);

  const gateValves = valves.rows.filter(r => r.valveType === 'GATE');
  assert.equal(gateValves.length, 133);

  const globeValves = valves.rows.filter(r => r.valveType === 'GLOBE');
  assert.equal(globeValves.length, 89);

  // Check GATE classes present (no CL400)
  const gateClasses = new Set(gateValves.map(r => r.classRating));
  assert.deepEqual([...gateClasses].sort(), ['150', '1500', '2500', '300', '600', '900']);
  assert.ok(!gateClasses.has('400'));

  // Check GLOBE classes present (no CL400)
  const globeClasses = new Set(globeValves.map(r => r.classRating));
  assert.deepEqual([...globeClasses].sort(), ['150', '1500', '2500', '300', '600', '900']);
  assert.ok(!globeClasses.has('400'));
});

test('DB Phase 81: lookups and negative fixtures', () => {
  // Positive lookup GATE
  const hitGate = lookupValveRecord(valves.rows, { valveType: 'GATE', endType: 'FLANGED', nps: '2', classRating: '150', facing: 'RF' });
  assert.equal(hitGate.ok, true);
  assert.equal(hitGate.row.id, 'VALVE|GATE|FLANGED|NPS2|CL150|RF');

  // Positive lookup GLOBE
  const hitGlobe = lookupValveRecord(valves.rows, { valveType: 'GLOBE', endType: 'FLANGED', nps: '2', classRating: '150', facing: 'RF' });
  assert.equal(hitGlobe.ok, true);
  assert.equal(hitGlobe.row.id, 'VALVE|GLOBE|FLANGED|NPS2|CL150|RF');

  // Negative fixture 1: BALL is lookup miss
  const missBall = lookupValveRecord(valves.rows, { valveType: 'BALL', endType: 'FLANGED', nps: '2', classRating: '150', facing: 'RF' });
  assert.equal(missBall.ok, false);

  // Negative fixture 2: CL400 Gate is lookup miss
  const missGate400 = lookupValveRecord(valves.rows, { valveType: 'GATE', endType: 'FLANGED', nps: '2', classRating: '400', facing: 'RF' });
  assert.equal(missGate400.ok, false);
});
