import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { summarizeDbIndex } from '../pipetools/js/db/dbCoverage.js';

const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const lineCount = (path) => read(path).split('\n').length;
const modulePath = 'pipetools/js/db/dbCoverage.js';
const renderPath = 'pipetools/js/render.js';
const cssPath = 'pipetools/dbCoverage.css';
const indexHtmlPath = 'pipetools/index.html';
const gatePath = 'gates/pipetools-agent-21-db-coverage.gate.test.js';
const workflowPath = '.github/workflows/pipetools-agent21.yml';
const manifestPath = 'data/audit/pipetools-agent-21-db-coverage-manifest.json';
const docPath = 'docs/pipetools/WAVE_13F_DB_INDEX_COVERAGE.md';

test('Agent 21 DB coverage browser files exist and stay small', () => {
  for (const path of [modulePath, renderPath, cssPath, indexHtmlPath, gatePath, workflowPath, manifestPath, docPath]) {
    assert.ok(existsSync(path), `${path} missing`);
  }
  for (const path of [modulePath, renderPath, gatePath]) {
    assert.ok(lineCount(path) <= 200, `${path} exceeds 200 lines`);
  }
});

test('DB coverage summary reports indexed and pending source rows', () => {
  const summary = summarizeDbIndex(json('pipetools/data/db-index.json'));
  assert.equal(summary.families, 6);
  assert.equal(summary.indexedRows, 56);
  assert.equal(summary.sourceRows, 720);
  assert.equal(summary.pendingRows, 664);
  assert.equal(summary.sourceFiles, 37);
  assert.equal(summary.svgReady, 5);
  assert.ok(summary.percent > 7 && summary.percent < 8);
});

test('coverage browser is rendered from the DB index before selected DB strips', () => {
  const render = read(renderPath);
  assert.ok(render.includes("import { renderDbCoverageStrip } from './db/dbCoverage.js'"));
  assert.ok(render.includes('const coverage = renderDbCoverageStrip(state.dbIndex)'));
  assert.ok(render.includes('${coverage}${dbIndexStrip'));
});

test('coverage browser exposes clickable family rows and pending labels', () => {
  const module = read(modulePath);
  assert.ok(module.includes('data-group="component"'));
  assert.ok(module.includes('db-index-browser'));
  assert.ok(module.includes('Pending rows'));
  assert.ok(module.includes('pendingRows: Math.max(sourceRows - indexedRows, 0)'));
});

test('coverage browser style and workflow are wired', () => {
  const html = read(indexHtmlPath);
  const css = read(cssPath);
  const workflow = read(workflowPath);
  assert.ok(html.includes('./dbCoverage.css'));
  assert.ok(css.includes('.db-coverage-summary'));
  assert.ok(workflow.includes('node --test gates/pipetools-agent-21-db-coverage.gate.test.js'));
});
