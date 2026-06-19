import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const lineCount = (path) => read(path).trimEnd().split('\n').length;
const MAX_NATIVE_MODULE_LINES = 300;
const inspector = read('pipetools/js/pipespecInspector.js');
const actions = read('pipetools/js/pipespecDetailActions.js');
const render = read('pipetools/js/render.js');
const css = read('pipetools/pipetools.css');
const html = read('pipetools/index.html');

test('Agent 20 inspector exposes metadata actions and JSON tab only', () => {
  assert.ok(inspector.includes('data-detail-toolbar="true"'));
  assert.ok(inspector.includes('data-detail-action="tab-details"'));
  assert.ok(inspector.includes('data-detail-action="tab-json"'));
  assert.ok(inspector.includes('data-detail-action="copy-json"'));
  assert.ok(inspector.includes('data-detail-action="open-svg-preview"'));
  assert.ok(inspector.includes('data-inspector-panel="json" hidden'));
  assert.equal(inspector.includes('data-detail-action="tab-svg"'), false);
  assert.equal(inspector.includes('data-pipespec-svg-host'), false);
});

test('Agent 20 actions operate on centre SVG host', () => {
  assert.ok(actions.includes('export function bindPipeSpecDetailActions'));
  assert.ok(actions.includes("action?.startsWith('tab-')"));
  assert.ok(actions.includes('svg-zoom-in'));
  assert.ok(actions.includes('svg-fit'));
  assert.ok(actions.includes('sourceSvg()'));
  assert.ok(actions.includes('data-pipespec-source-svg-host'));
  assert.ok(actions.includes('Centre SVG not ready'));
});

test('Agent 20 render mounts centre SVG before binding actions', () => {
  assert.ok(render.includes('renderPipeSpecInspector(state.selectedRow)'));
  assert.ok(render.includes('renderSourceSvgPanel(state.selectedRow);'));
  assert.ok(render.includes('bindPipeSpecDetailActions(state.selectedRow);'));
  assert.ok(render.includes('data-pipespec-source-svg-host="true"'));
  assert.equal(render.includes('mountInspectorSvg'), false);
});

test('Agent 20 centre and inspector styles are present', () => {
  for (const selector of ['.source-svg-panel', '.source-svg-tools', '.detail-toolbar', '.detail-icon-btn', '.detail-json-panel']) {
    assert.ok(css.includes(selector), `${selector} missing`);
  }
  assert.ok(html.includes('source-svg-panel'));
});

test('Agent 20 native modules stay within relaxed 300-line gate', () => {
  for (const file of ['pipetools/js/pipespecInspector.js', 'pipetools/js/pipespecDetailActions.js', 'gates/pipetools-agent-20-svg-detail-actions.gate.test.js', 'pipetools/js/render.js']) {
    assert.ok(lineCount(file) <= MAX_NATIVE_MODULE_LINES, `${file} has ${lineCount(file)} lines`);
  }
});
