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
const MAX_NATIVE_MODULE_LINES = 300;

test('Agent 21 DB coverage browser files exist and native modules stay within relaxed line gate', () => {
  for (const path of [modulePath, renderPath, cssPath, indexHtmlPath, gatePath, workflowPath, manifestPath, docPath]) {
    assert.ok(existsSync(path), `${path} missing`);
  }
  for (const path of [modulePath, gatePath, renderPath]) {
    assert.ok(lineCount(path) <= MAX_NATIVE_MODULE_LINES, `${path} exceeds ${MAX_NATIVE_MODULE_LINES}-line limit`);
  }
});

test('DB coverage summary reports complete indexed source rows', () => {
  const summary = summarizeDbIndex(json('pipetools/data/db-index.json'));
  assert.equal(summary.families, 8);
  assert.equal(summary.indexedRows, 2136);
  assert.equal(summary.sourceRows, 2136);
  assert.equal(summary.pendingRows, 0);
  assert.equal(summary.sourceFiles, 69);
  assert.equal(summary.svgReady, 5);
  assert.equal(summary.percent, 100);
});

test('coverage browser is rendered from the DB index before component strips', () => {
  const render = read(renderPath);
  assert.ok(render.includes("import { renderDbCoverageStrip } from './db/dbCoverage.js'"));
  assert.ok(render.includes('const coverage = renderDbCoverageStrip(state.dbIndex)'));
  assert.ok(render.includes('${searchStrip(state)}${coverage}${strip('));
});

test('coverage browser exposes clickable family rows and pending labels', () => {
  const module = read(modulePath);
  assert.ok(module.includes('data-group="component"'));
  assert.ok(module.includes('db-index-browser'));
  assert.ok(module.includes('Pending rows'));
  assert.ok(module.includes('pendingRows: Math.max(sourceRows - indexedRows, 0)'));
});

test('coverage browser style and workflow are wired', () => {
  assert.ok(read(indexHtmlPath).includes('./dbCoverage.css'));
  assert.ok(read(cssPath).includes('.db-coverage-summary'));
  assert.ok(read(workflowPath).includes('node --test gates/pipetools-agent-21-db-coverage.gate.test.js'));
});
