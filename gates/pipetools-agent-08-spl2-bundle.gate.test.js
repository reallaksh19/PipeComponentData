import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const countLines = (path) => read(path).split('\n').length;
const MAX_NATIVE_MODULE_LINES = 300;

const nativeCheckedFiles = [
  'pipetools/js/bundle/bundleConfig.js',
  'pipetools/js/bundle/bundleView.js',
  'gates/pipetools-agent-08-spl2-bundle.gate.test.js',
];

const vendoredSpl2Files = [
  'spl2-bundle/spl2_master.html',
  'spl2-bundle/css/app.css',
  'spl2-bundle/js/spl2/spl2_master.js',
  'spl2-bundle/js/spl2/spl2_database.js',
  'spl2-bundle/js/spl2/spl2_loop_algo.js',
  'spl2-bundle/js/spl2/spl2_canvas.js',
  'spl2-bundle/js/spl2/spl2_loop_canvas.js',
  'spl2-bundle/js/spl2/spl2_loop_logic.js',
  'spl2-bundle/js/spl2/spl2_rack_canvas.js',
  'spl2-bundle/js/spl2/spl2_rack_logic.js',
  'spl2-bundle/js/spl2/spl2_simp_canvas.js',
  'spl2-bundle/js/spl2/spl2_simp_logic.js',
];

test('SPL2 source-copied bundle files exist', () => {
  for (const path of vendoredSpl2Files) assert.ok(existsSync(path), `${path} missing`);
  assert.ok(existsSync('docs/pipetools/SPL2_LEGACY_IMPORT.md'));
});

test('SPL2 HTML preserves upstream calculation panels and canvas IDs', () => {
  const html = read('spl2-bundle/spl2_master.html');
  for (const token of [
    'id="top-tab-spl2"',
    'data-target="tab-loop"',
    'data-target="tab-rack"',
    'data-target="tab-simp"',
    'data-target="tab-db"',
    'data-target="tab-config"',
    'Loop Calculations',
    'Pipe Rack Calculation',
    'Simplified Method',
    'canvas-loop',
    'canvas-rack-section',
    'canvas-rack-plan',
    'canvas-simp-3d',
    'loop_inp_nps',
    'rack_btn_run',
    'simp_btn_run',
  ]) assert.ok(html.includes(token), `missing source token: ${token}`);

  assert.equal(html.toLowerCase().includes('placeholder reserves'), false);
  assert.equal(html.includes('data-pipetools-legacy="spl2"'), false);
});

test('SPL2 master script preserves upstream import graph and calculation controller', () => {
  const js = read('spl2-bundle/js/spl2/spl2_master.js');
  for (const token of [
    "import { SPL2_DB } from './spl2_database.js'",
    "calcLoopFromSpreadsheet",
    "RackSectionCanvas",
    "RackPlanCanvas",
    "SimplifiedCanvas",
    "LoopCanvas",
    "document.querySelectorAll('.side-btn')",
    "getAttribute('data-target')",
    "renderDatabaseFrames",
    "global_inp_units",
    "loop_btn_run",
    "rack_btn_run",
    "simp_btn_run",
    "function calculateLoop",
    "function calculateRackLoad",
    "function calculateSimplified",
  ]) assert.ok(js.includes(token), `missing source JS token: ${token}`);
});

test('PipeTools bundle config points to the iframe target', () => {
  const config = read('pipetools/js/bundle/bundleConfig.js');
  assert.ok(config.includes('../spl2-bundle/spl2_master.html'));
  assert.ok(config.includes('reallaksh19/Simplified_Analysis'));
});

test('native Agent 08 modules stay below relaxed 300-line gate; vendored SPL2 source is exempt', () => {
  for (const path of nativeCheckedFiles) {
    assert.ok(countLines(path) <= MAX_NATIVE_MODULE_LINES, `${path} exceeds ${MAX_NATIVE_MODULE_LINES} lines`);
  }
  assert.equal(nativeCheckedFiles.includes('spl2-bundle/spl2_master.html'), false);
  assert.equal(nativeCheckedFiles.includes('spl2-bundle/js/spl2/spl2_master.js'), false);
});
