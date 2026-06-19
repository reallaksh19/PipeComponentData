import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const lineCount = (path) => read(path).trimEnd().split('\n').length;

const inspector = read('pipetools/js/pipespecInspector.js');
const actions = read('pipetools/js/pipespecDetailActions.js');
const render = read('pipetools/js/render.js');
const css = read('pipetools/pipetools.css');
const ci = read('.github/workflows/pipetools-ci.yml');
const pages = read('.github/workflows/pages.yml');

test('Agent 20 inspector exposes detailed SVG actions', () => {
  assert.match(inspector, /data-detail-toolbar="true"/);
  assert.match(inspector, /data-detail-action="toggle-json"/);
  assert.match(inspector, /data-detail-action="copy-json"/);
  assert.match(inspector, /data-detail-action="open-svg-preview"/);
  assert.match(inspector, /data-detail-json="true"/);
  assert.match(inspector, /data-detail-metadata="true"/);
  assert.match(inspector, /data-pipespec-svg-host="true"/);
});

test('Agent 20 detail actions support JSON copy and SVG preview', () => {
  assert.match(actions, /export function bindPipeSpecDetailActions/);
  assert.match(actions, /navigator\?\.clipboard\?\.writeText/);
  assert.match(actions, /execCommand\?\.\('copy'\)/);
  assert.match(actions, /window\.open/);
  assert.match(actions, /querySelector\('\[data-pipespec-svg-host\] svg'\)/);
  assert.match(actions, /setStatus\(host, 'SVG preview not ready'\)/);
});

test('Agent 20 render binds actions after inspector render', () => {
  assert.match(render, /import \{ bindPipeSpecDetailActions \} from '\.\/pipespecDetailActions\.js';/);
  assert.match(render, /renderPipeSpecInspector\(state\.selectedRow\)/);
  assert.match(render, /mountInspectorSvg\(state\.selectedRow\);\n\s*bindPipeSpecDetailActions\(state\.selectedRow\);/);
});

test('Agent 20 detail action styles are present', () => {
  for (const selector of ['.detail-toolbar', '.detail-icon-btn', '.detail-action-status', '.detail-json-panel', '.detail-metadata']) {
    assert.ok(css.includes(selector), `${selector} missing`);
  }
});

test('Agent 20 modules stay below 200 lines', () => {
  for (const file of [
    'pipetools/js/pipespecInspector.js',
    'pipetools/js/pipespecDetailActions.js',
    'pipetools/js/render.js',
    'gates/pipetools-agent-20-svg-detail-actions.gate.test.js',
  ]) {
    assert.ok(lineCount(file) < 200, `${file} has ${lineCount(file)} lines`);
  }
});

test('Agent 20 gate is cumulative in CI and Pages', () => {
  const command = 'node --test gates/pipetools-agent-20-svg-detail-actions.gate.test.js';
  assert.ok(ci.includes(command));
  assert.ok(pages.includes(command));
  assert.ok(ci.includes('test -f _site/pipetools/js/pipespecDetailActions.js'));
  assert.ok(pages.includes('test -f _site/pipetools/js/pipespecDetailActions.js'));
});
