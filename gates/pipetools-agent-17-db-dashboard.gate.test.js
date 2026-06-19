import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const lineCount = (path) => read(path).split('\n').length;
const appPath = 'pipetools/js/app.js';
const renderPath = 'pipetools/js/render.js';
const gatePath = 'gates/pipetools-agent-17-db-dashboard.gate.test.js';
const manifestPath = 'data/audit/pipetools-agent-17-db-dashboard-manifest.json';
const docPath = 'docs/pipetools/WAVE_13B_DB_DASHBOARD.md';
const MAX_NATIVE_MODULE_LINES = 300;

test('Agent 17 DB dashboard files exist and native gate uses relaxed 300-line limit', () => {
  for (const path of [appPath, renderPath, gatePath, manifestPath, docPath]) {
    assert.ok(existsSync(path), `${path} missing`);
  }
  for (const path of [appPath, gatePath]) {
    assert.ok(lineCount(path) <= MAX_NATIVE_MODULE_LINES, `${path} exceeds ${MAX_NATIVE_MODULE_LINES} lines`);
  }
});

test('PipeTools loads the DB index before component rows', () => {
  const app = read(appPath);
  assert.ok(app.includes("loadDbIndex({ url: DB_INDEX_URL })"));
  assert.ok(app.includes('state.dbFamilies = getDbFamilies(state.dbIndex)'));
  assert.ok(app.includes('loadFamilyRows(pipeSpecState.filters.component)'));
  assert.ok(app.includes("if (key === 'component')"));
});

test('component switching lazy-loads selected DB family rows', () => {
  const app = read(appPath);
  assert.ok(app.includes('async function setComponent(value)'));
  assert.ok(app.includes("reducePipeSpecState(pipeSpecState, { type: 'SET_COMPONENT'"));
  assert.ok(app.includes('state.loadingComponent = component'));
  assert.ok(app.includes('const rows = await loadFamilyRows(component)'));
});

test('dashboard cards and filters are generated from DB index metadata', () => {
  const render = read(renderPath);
  assert.ok(render.includes('state.dbFamilies?.length'));
  assert.ok(render.includes("strip('Components'"));
  assert.ok(render.includes('component-strip'));
  assert.ok(render.includes('family.subtypes.map'));
  assert.ok(render.includes('family?.availableFilters?.includes(key)'));
  assert.ok(render.includes('renderDbCoverageStrip(state.dbIndex)'));
  assert.ok(!render.includes('VALVE_TYPES.map'));
});

test('table headers use DB keyFields instead of fixed valve-only columns', () => {
  const render = read(renderPath);
  assert.ok(render.includes('family?.keyFields'));
  assert.ok(render.includes('tableFields(family)'));
  assert.ok(render.includes('family.repositoryPath'));
  assert.ok(!render.includes('<th>Type</th><th>End</th><th>Facing</th><th>NPS / DN</th>'));
});

test('CI workflows preserve Agent 17 cumulative DB dashboard gate', () => {
  const ci = read('.github/workflows/pipetools-ci.yml');
  const pages = read('.github/workflows/pages.yml');
  assert.ok(ci.includes('pipetools-agent-17-db-dashboard.gate.test.js'));
  assert.ok(pages.includes('pipetools-agent-17-db-dashboard.gate.test.js'));
});
