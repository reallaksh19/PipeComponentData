import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { applySearchToRows, parseEngineeringSearch } from '../pipetools/js/search/search.js';

const SOURCE_FILES = [
  'pipetools/js/app.js',
  'pipetools/js/render.js',
  'pipetools/js/search/aliases.js',
  'pipetools/js/search/chips.js',
  'pipetools/js/search/inference.js',
  'pipetools/js/search/normalize.js',
  'pipetools/js/search/parser.js',
  'pipetools/js/search/score.js',
  'pipetools/js/search/search.js',
];
const MAX_NATIVE_MODULE_LINES = 300;

const FIXTURE_ROWS = [
  row('VALVE|GATE|FLANGED|NPS8|CL300|RF', 'VALVE', 'GATE', 'FLANGED', 'RF', '8', 200, '300'),
  row('VALVE|GATE|FLANGED|NPS8|CL150|RF', 'VALVE', 'GATE', 'FLANGED', 'RF', '8', 200, '150'),
  row('VALVE|GLOBE|BUTT-WELD|NPS4|CL150', 'VALVE', 'GLOBE', 'BUTT-WELD', '', '4', 100, '150'),
  { id: 'FLANGE|WN|RF|NPS6|CL300', componentType: 'FLANGE', type: 'WN', facing: 'RF', nps: '6', dn: 150, classRating: '300', dataStatus: 'READY' },
  { id: 'FITTING|ELBOW_90_LR|NPS8|SCH80', componentType: 'FITTING', type: 'ELBOW_90_LR', nps: '8', schedule: 'SCH80', dataStatus: 'READY' },
];

test('Agent 04 search modules stay below relaxed 300-line gate', () => {
  for (const file of SOURCE_FILES) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= MAX_NATIVE_MODULE_LINES, `${file} has ${lines} lines`);
  }
});

test('engineering parser handles valve shorthand query', () => {
  const parsed = parseEngineeringSearch('GATE 8" FL 300#');
  assert.deepEqual(parsed.filters, {
    component: 'VALVE', valveType: 'GATE', endType: 'FLANGED', classRating: '300', nps: '8'
  });
});

test('engineering parser handles DN, facing inference, and BW invalid facing cleanup', () => {
  const rf = parseEngineeringSearch('GATE DN200 RF 300');
  assert.equal(rf.filters.endType, 'FLANGED');
  assert.equal(rf.filters.facing, 'RF');
  assert.equal(rf.filters.dn, 200);
  const bw = parseEngineeringSearch('globe 4 bw 150 rtj');
  assert.equal(bw.filters.endType, 'BUTT-WELD');
  assert.equal(bw.filters.facing, undefined);
  assert.equal(bw.warnings.length, 1);
});

test('engineering search ranks exact structured rows first', () => {
  const result = applySearchToRows('GATE 8" FL 300#', FIXTURE_ROWS);
  assert.equal(result.rows[0].id, 'VALVE|GATE|FLANGED|NPS8|CL300|RF');
  assert.equal(result.chips.some((chip) => chip.label === 'Class' && chip.value === 'CL 300'), true);
});

test('engineering parser covers flange and fitting search syntax', () => {
  assert.equal(applySearchToRows('flange wn rf 6 300', FIXTURE_ROWS).rows[0].id, 'FLANGE|WN|RF|NPS6|CL300');
  assert.equal(applySearchToRows('elbow 90 lr 8 sch80', FIXTURE_ROWS).rows[0].id, 'FITTING|ELBOW_90_LR|NPS8|SCH80');
});

function row(id, componentType, valveType, endType, facing, nps, dn, classRating) {
  return { id, componentType, valveType, endType, facing, nps, dn, classRating, dataStatus: 'READY' };
}
