import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const lineCount = (path) => read(path).trimEnd().split('\n').length;

test('Agent 23 PipeSpec page is a fixed-height workbench', () => {
  const css = read('pipetools/pipetools.css');
  assert.match(css, /html, body \{ height: 100%; overflow: hidden; \}/);
  assert.match(css, /\.app-shell \{ height: 100vh;[^}]*grid-template-rows: 62px 44px minmax\(0, 1fr\)/);
  assert.match(css, /\.workspace \{[^}]*overflow: hidden;[^}]*grid-template-rows: auto minmax\(0, 1fr\)/);
  assert.match(css, /\.result-grid \{[^}]*height: 100%;[^}]*grid-template-columns: minmax\(0, 1fr\) 380px/);
});

test('Agent 23 keeps only table and inspector scrollable in desktop mode', () => {
  const css = read('pipetools/pipetools.css');
  assert.match(css, /\.table-frame \{[^}]*height: 100%;[^}]*overflow: auto;/);
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

test('Agent 23 new workbench modules stay below 200 lines', () => {
  for (const file of [
    'pipetools/js/db/dbCoverage.js',
    'pipetools/dbCoverage.css',
    'gates/pipetools-agent-23-workbench-layout.gate.test.js',
  ]) {
    assert.ok(lineCount(file) < 200, `${file} has ${lineCount(file)} lines`);
  }
});

test('Agent 23 legacy aggregate files are explicitly exempt from line-count gate', () => {
  const manifest = read('data/audit/pipetools-agent-23-workbench-layout-manifest.json');
  assert.ok(manifest.includes('legacyLineLimitExemptions'));
  assert.ok(manifest.includes('pipetools/pipetools.css'));
  assert.ok(manifest.includes('pipetools/js/render.js'));
});
