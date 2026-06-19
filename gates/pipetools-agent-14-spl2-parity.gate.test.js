import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const lines = (path) => read(path).split('\n').length;

test('SPL2 source-parity shell files exist', () => {
  assert.ok(existsSync('spl2-bundle/css/app.css'));
  assert.ok(existsSync('spl2-bundle/spl2_master.html'));
  assert.ok(existsSync('spl2-bundle/js/spl2/spl2_master.js'));
});

test('SPL2 shell exposes upstream navigation and panes', () => {
  const html = read('spl2-bundle/spl2_master.html');
  for (const term of [
    'Loop Calculations',
    'Pipe Rack Calculation',
    'Simplified Method',
    'Database',
    '2D Bundle Config',
    'Diagnostics',
  ]) assert.ok(html.includes(term), `${term} missing`);
});

test('SPL2 shell preserves upstream canvas and input identifiers', () => {
  const html = read('spl2-bundle/spl2_master.html');
  for (const id of [
    'canvas-loop',
    'canvas-rack-section',
    'canvas-rack-plan',
    'canvas-simp-3d',
    'loop_inp_s',
    'loop_inp_g',
    'loop_inp_h',
    'loop_inp_w',
    'global_inp_units',
    'global_inp_ins_dens',
  ]) assert.ok(html.includes(id), `${id} missing`);
});

test('SPL2 controller includes real source-parity actions', () => {
  const js = read('spl2-bundle/js/spl2/spl2_master.js');
  assert.ok(js.includes('function calculateLoop'));
  assert.ok(js.includes('function calculateRackLoad'));
  assert.ok(js.includes('function calculateSimplified'));
  assert.ok(js.includes('renderDatabaseFrames'));
  assert.ok(js.includes('drawLoop'));
});

test('new source-parity modules stay below 200 lines', () => {
  for (const path of [
    'spl2-bundle/js/spl2/spl2_master.js',
    'spl2-bundle/css/app.css',
    'gates/pipetools-agent-14-spl2-parity.gate.test.js',
  ]) assert.ok(lines(path) <= 200, `${path} exceeds 200 lines`);
});
