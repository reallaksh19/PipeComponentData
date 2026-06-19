import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const lineCount = (path) => read(path).trimEnd().split('\n').length;
const MAX_NATIVE_MODULE_LINES = 300;

test('Agent 23 PipeSpec page is a fixed-height three-zone workbench', () => {
  const css = read('pipetools/pipetools.css');
  const html = read('pipetools/index.html');
  assert.match(css, /html, body \{ height: 100%; overflow: hidden; \}/);
  assert.match(css, /\.app-shell \{ height: 100vh;[^}]*grid-template-rows: 62px 44px minmax\(0, 1fr\)/);
  assert.match(css, /\.workspace \{[^}]*overflow: hidden;[^}]*grid-template-rows: auto minmax\(0, 1fr\)/);
  assert.ok(css.includes('grid-template-columns: minmax(360px, .78fr) minmax(520px, 1.35fr) 340px'));
  assert.ok(html.includes('source-svg-panel'));
});

test('Agent 23 keeps table, centre SVG, and inspector bounded in desktop mode', () => {
  const css = read('pipetools/pipetools.css');
  assert.match(css, /\.table-frame \{[^}]*height: 100%;[^}]*overflow: auto;/);
  assert.match(css, /\.source-svg-body \{[^}]*min-height: 0;[^}]*display: grid;/);
  assert.match(css, /\.inspector-body \{[^}]*min-height: 0;[^}]*overflow: auto;/);
  assert.ok(!css.includes('max-height: calc(100vh - 360px)'), 'old long-page table height must not return');
});

test('Agent 23 dashboard order is compact health, components, subtype, filters', () => {
  const render = read('pipetools/js/render.js');
  assert.ok(render.includes('${coverage}${strip(\'Components\''));
  assert.ok(render.includes('component-strip'));
  assert.ok(render.includes('subtype-strip'));
  assert.ok(render.includes('filter-strip'));
  assert.ok(!render.includes('Selected DB'));
  assert.ok(!render.includes('dbIndexStrip('));
});

test('Agent 23 DB health is compact and collapses details by default', () => {
  const module = read('pipetools/js/db/dbCoverage.js');
  assert.ok(module.includes('DB Health'));
  assert.ok(module.includes('db-coverage-summary'));
  assert.ok(module.includes('<summary>Details</summary>'));
  assert.ok(module.includes('db-index-browser'));
  assert.ok(!module.includes('<details open'));
});

test('Agent 23 new workbench modules stay below relaxed 300-line gate', () => {
  for (const file of [
    'pipetools/js/db/dbCoverage.js',
    'pipetools/dbCoverage.css',
    'gates/pipetools-agent-23-workbench-layout.gate.test.js',
  ]) {
    assert.ok(lineCount(file) <= MAX_NATIVE_MODULE_LINES, `${file} has ${lineCount(file)} lines`);
  }
});

test('Agent 23 legacy aggregate files are explicitly exempt from line-count gate', () => {
  const manifest = read('data/audit/pipetools-agent-23-workbench-layout-manifest.json');
  assert.ok(manifest.includes('legacyLineLimitExemptions'));
  assert.ok(manifest.includes('pipetools/pipetools.css'));
  assert.ok(manifest.includes('pipetools/js/render.js'));
});
