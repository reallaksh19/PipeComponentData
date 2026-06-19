import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const lines = (path) => read(path).split('\n').length;
const MAX_NATIVE_MODULE_LINES = 300;

test('Agent 12 keeps pipe span modules below relaxed 300-line gate', () => {
  assert.ok(lines('pipetools/js/pipeSpan/ui.js') <= MAX_NATIVE_MODULE_LINES, 'pipe span ui module must stay at or below 300 lines');
  assert.ok(lines('pipetools/js/svg/pipeSpan.js') <= MAX_NATIVE_MODULE_LINES, 'pipe span svg module must stay at or below 300 lines');
});

test('Pipe Span uses CRF-style misc-calc layout sections without calculator rail', () => {
  const ui = read('pipetools/js/pipeSpan/ui.js');
  assert.match(ui, /no-calculator-rail/);
  assert.doesNotMatch(ui, /<aside class="pipe-span-rail"/);
  assert.doesNotMatch(ui, /Pipe Shell Indentation/);
  assert.match(ui, /Unit Mode/);
  assert.match(ui, /Engineering Sketch/);
  assert.match(ui, /Formula Console/);
  assert.match(ui, /CRF-4-1 \/ Misc Calc/);
});

test('Pipe Span renders method comparison and source-parity sketch', () => {
  const ui = read('pipetools/js/pipeSpan/ui.js');
  const svg = read('pipetools/js/svg/pipeSpan.js');
  assert.match(ui, /Continuous span/);
  assert.match(ui, /Simply supported span/);
  assert.match(ui, /Indentation span/);
  assert.match(ui, /Ref\. span/);
  assert.match(svg, /Pipe Span Engineering Sketch/);
  assert.match(svg, /Governing span/);
  assert.match(svg, /Ref\./);
  assert.doesNotMatch(svg, /QMS ref/);
  assert.match(svg, /Wall/);
  assert.match(svg, /Load/);
});

test('renderMain passes actions to Pipe Span main view', () => {
  const render = read('pipetools/js/render.js');
  assert.match(render, /renderPipeSpanMain\(state, actions, pipeSpanSvg\)/);
});

test('Pipe Span parity styles are present', () => {
  const css = read('pipetools/pipetools-overrides.css');
  assert.match(css, /\.pipe-span-shell/);
  assert.match(css, /\.no-calculator-rail/);
  assert.match(css, /\.pipe-span-sketch/);
  assert.match(css, /\.pipe-span-console/);
});
