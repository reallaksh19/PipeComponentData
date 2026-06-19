import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const sourceFiles = [
  'spl2-bundle/spl2_master.html',
  'spl2-bundle/css/app.css',
  'spl2-bundle/js/spl2/spl2_master.js',
  'spl2-bundle/js/spl2/spl2_database.js',
  'spl2-bundle/js/spl2/spl2_loop_algo.js',
  'spl2-bundle/js/spl2/spl2_canvas.js',
  'spl2-bundle/js/spl2/spl2_loop_canvas.js',
  'spl2-bundle/js/spl2/spl2_rack_canvas.js',
  'spl2-bundle/js/spl2/spl2_simp_canvas.js',
  'spl2-bundle/js/spl2/spl2_loop_logic.js',
  'spl2-bundle/js/spl2/spl2_rack_logic.js',
  'spl2-bundle/js/spl2/spl2_simp_logic.js',
];

test('SPL2 exact source files are vendored', () => {
  for (const path of sourceFiles) assert.ok(existsSync(path), `${path} missing`);
});

test('SPL2 master HTML preserves upstream UI and options', () => {
  const html = read('spl2-bundle/spl2_master.html');
  for (const term of [
    'Loop Calculations',
    'Pipe Rack Calculation',
    'Simplified Method',
    'Database',
    '2D Bundle Config',
    'Diagnostics',
    'GLOBAL CONSTANTS & CONFIGURATION',
    'canvas-loop',
    'canvas-rack-section',
    'canvas-rack-plan',
    'canvas-simp-3d',
    'global_inp_units',
    'global_inp_ins_dens',
  ]) assert.ok(html.includes(term), `${term} missing`);
});

test('SPL2 controller uses upstream import graph', () => {
  const js = read('spl2-bundle/js/spl2/spl2_master.js');
  for (const term of [
    "import { SPL2_DB } from './spl2_database.js'",
    "import { calcLoopFromSpreadsheet } from './spl2_loop_algo.js'",
    "import { RackSectionCanvas, RackPlanCanvas } from './spl2_rack_canvas.js'",
    "import { SimplifiedCanvas } from './spl2_simp_canvas.js'",
    "import { LoopCanvas } from './spl2_loop_canvas.js'",
    'renderDatabaseFrames',
    'toggleUnits',
  ]) assert.ok(js.includes(term), `${term} missing`);
});

test('compact placeholder SPL2 rebuild is not present', () => {
  const js = read('spl2-bundle/js/spl2/spl2_master.js');
  assert.equal(js.includes('SPL2 compact loop screening'), false);
  assert.equal(js.includes('drawLoop('), false);
});
