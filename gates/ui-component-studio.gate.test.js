import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createComponentStudioModel } from '../src/index.js';
import { componentSearch, SEARCH_MODE } from '../src/db/componentSearch.js';

const searchIndex = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));
const aliases = JSON.parse(fs.readFileSync('data/search/component-aliases.json', 'utf8'));
const valves = JSON.parse(fs.readFileSync('data/normalized/valves.json', 'utf8'));
const coverage = JSON.parse(fs.readFileSync('data/audit/db-coverage-dashboard.json', 'utf8'));
const readiness = JSON.parse(fs.readFileSync('data/audit/release-readiness.json', 'utf8'));
const integration = JSON.parse(fs.readFileSync('data/exports/integration-contract.manifest.json', 'utf8'));

const EXACT_VALVE_8_150_RF = { componentType: 'VALVE', valveType: 'GATE', classRating: '150', nps: '8', facing: 'RF' };

function studio(query = 'gate valve 8 class 150 rf', filters = EXACT_VALVE_8_150_RF) {
  return createComponentStudioModel({ query, searchIndex, aliases, filters, catalogs: { VALVE: valves.rows } });
}

test('UI Studio: model declares two-pane workspace and bottom catalog dashboard', () => {
  const model = studio();
  assert.equal(model.schema, 'pipedata-component-studio-model/v1');
  assert.deepEqual(model.layout.panes, ['selector', 'canvas', 'catalogDashboard']);
  assert.deepEqual(model.layout.mainSplit, { selector: '1/3', canvas: '2/3' });
  assert.equal(model.layout.sourceTreeVisible, false);
  assert.equal(model.layout.sourceAuditMode, 'collapsed-details');
  assert.equal(model.canvas.embedsDataPanel, true);
});

test('UI Studio: selector hierarchy is derived from the public search index', () => {
  const model = studio();
  assert.ok(model.selector.hierarchy.componentTypes.includes('VALVE'));
  assert.ok(model.selector.hierarchy.valveTypes.includes('GATE'));
  assert.equal(model.selector.hierarchy.valveTypes.includes('WN'), false);
  assert.ok(model.selector.hierarchy.flangeTypes.includes('WN'));
});

test('UI Studio: exact valve result is DB-backed and embedded in canvas data', () => {
  const model = studio();
  assert.equal(model.search.ok, true);
  assert.equal(model.search.selectedId, 'VALVE|GATE|FLANGED|NPS8|CL150|RF');
  assert.match(model.canvas.dataPanel.title, /GATE/);
  assert.equal(valueOf(model.canvas.dataPanel, 'RF Face-to-face'), 292);
  assert.equal(valueOf(model.canvas.dataPanel, 'RF/RTJ Weight'), 144);
  assert.equal(model.sourceAudit.source, 'docs/Pipedata/Database/Vlfl/VLV1150.csv');
  assert.equal(model.sourceAudit.visibleInNormalWorkflow, false);
});

test('UI Studio: exact search rejects partial text and wrong class fallback', () => {
  const partial = componentSearch('gate valve', searchIndex, { aliases, mode: SEARCH_MODE.EXACT_ALIAS_ONLY });
  assert.equal(partial.ok, false);

  const wrongClass = studio('gate valve 8 class 3000 rf', { ...EXACT_VALVE_8_150_RF, classRating: '3000' });
  assert.equal(wrongClass.search.ok, false);
  assert.equal(wrongClass.search.selectedId, null);
  assert.equal(wrongClass.selector.noFallbackPolicy.includes('nearest'), true);
});

test('UI Studio: complete structured filters can select an exact component without fallback', () => {
  const result = componentSearch('', searchIndex, { aliases, mode: SEARCH_MODE.EXACT_ALIAS_ONLY, filters: EXACT_VALVE_8_150_RF });
  assert.equal(result.ok, true);
  assert.equal(result.results[0].id, 'VALVE|GATE|FLANGED|NPS8|CL150|RF');
});

test('UI Studio: gasket quick filter does not imply unavailable size or class coverage', () => {
  const valid = componentSearch('RTJ GASKET', searchIndex, {
    aliases,
    mode: SEARCH_MODE.EXACT_ALIAS_ONLY,
    filters: { componentType: 'GASKET', subtype: 'RTJ', facing: 'RTJ' },
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.results[0].id, 'GASKET|RTJ|UNKNOWN|UNKNOWN|RTJ');
  assert.equal(componentSearch('RTJ GASKET 4 300', searchIndex, { aliases, mode: SEARCH_MODE.EXACT_ALIAS_ONLY }).ok, false);
});

test('UI Studio: coverage dashboard is static audit data only', () => {
  assert.equal(coverage.schema, 'pipedata-db-coverage-dashboard/v1');
  assert.equal(coverage.policy.noFabrication, true);
  assert.equal(coverage.policy.noEngineeringFallback, true);
  assert.equal(coverage.summary.missingCatalogRows, 0);
  assert.equal(coverage.ok, true);
});

test('UI Studio: release and catalog dashboard are collapsed by default', () => {
  const html = fs.readFileSync('studio/index.html', 'utf8');
  assert.equal(readiness.status, 'FOUNDATION_READY');
  assert.equal(readiness.productionComplete, false);
  assert.equal(integration.status, 'STABLE_FOUNDATION_CONTRACT');
  assert.match(html, /<details class="status-strip" id="release-details">/);
  assert.match(html, /<details class="dashboard" id="catalog-dashboard"/);
  assert.doesNotMatch(html, /<details class="status-strip" id="release-details" open>/);
  assert.doesNotMatch(html, /<details class="dashboard" id="catalog-dashboard" open/);
  assert.doesNotMatch(html, /docs\/Pipedata\/Database/);
});

test('UI Studio: static shell exposes selector, canvas data, and bottom catalog browser', () => {
  const html = fs.readFileSync('studio/index.html', 'utf8');
  const css = fs.readFileSync('studio/studio.css', 'utf8');
  const js = fs.readFileSync('studio/component-studio-app.js', 'utf8');
  assert.match(html, /studio-workspace/);
  assert.match(html, /<nav class="category-tabs" id="category-tabs"/);
  assert.doesNotMatch(html, /<aside class="sidebar"/);
  assert.match(html, /Component Selector/);
  assert.match(html, /Graphics and Component Data Canvas/);
  assert.match(html, /canvas-data/);
  assert.match(html, /Catalog Browser/);
  assert.match(html, /browser-metrics/);
  assert.match(css, /grid-template-columns: minmax\(300px, 1fr\) minmax\(620px, 2fr\)/);
  assert.match(css, /catalog-browser-dashboard/);
  assert.match(js, /normalizeSmartFilters/);
  assert.match(js, /indexedValues/);
  assert.match(js, /filterTags/);
  assert.doesNotMatch(js, /Source:\s*<code>/);
  assertAsciiOnly('studio/index.html', html);
  assertAsciiOnly('studio/studio.css', css);
  assertAsciiOnly('studio/component-studio-app.js', js);
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/);
});

test('UI Studio: Pages artifact workflow publishes minimal JSON and blocks raw DB tree', () => {
  const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /cp data\/normalized\/\*\.json _site\/data\/normalized\//);
  assert.match(workflow, /cp data\/audit\/\*\.json _site\/data\/audit\//);
  assert.match(workflow, /Raw source database tree must not be published to Pages/);
});

test('UI Studio: browser smoke gate is wired without new dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts['ui:smoke'], 'node --test gates/ui-browser-smoke.gate.test.js');
  assert.match(pkg.scripts['ui:gate'], /ui-browser-smoke\.gate\.test\.js/);
  assert.deepEqual(pkg.devDependencies, {});
});

test('UI Studio: model and gates stay small', () => {
  assert.ok(lineCount('src/ui/createComponentStudioModel.js') <= 200);
  assert.ok(lineCount('gates/ui-component-studio.gate.test.js') <= 220);
  assert.ok(lineCount('gates/ui-browser-smoke.gate.test.js') <= 340);
});

function valueOf(panel, label) {
  return panel.attributes.find((item) => item.label === label)?.value;
}

function lineCount(path) {
  return fs.readFileSync(path, 'utf8').trim().split('\n').length;
}

function assertAsciiOnly(path, value) {
  const invalid = [...value].find((char) => char.charCodeAt(0) > 127);
  assert.equal(invalid, undefined, `${path} contains non-ASCII Studio UI text`);
}
