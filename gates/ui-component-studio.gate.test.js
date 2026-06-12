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
  return createComponentStudioModel({
    query,
    searchIndex,
    aliases,
    filters,
    catalogs: { VALVE: valves.rows },
  });
}

test('UI Studio: model preserves three-pane workflow without source tree', () => {
  const model = studio();
  assert.equal(model.schema, 'pipedata-component-studio-model/v1');
  assert.deepEqual(model.layout.panes, ['selector', 'data', 'preview']);
  assert.equal(model.layout.sourceTreeVisible, false);
  assert.equal(model.layout.sourceAuditMode, 'separate-panel');
});

test('UI Studio: exact valve result is DB-backed and source tagged', () => {
  const model = studio();
  assert.equal(model.search.ok, true);
  assert.equal(model.search.selectedId, 'VALVE|GATE|FLANGED|NPS8|CL150|RF');
  assert.equal(model.dataPanel.title, 'GATE · VALVE · FLANGED · RF · NPS 8 · Class 150');
  assert.equal(valueOf(model, 'RF Face-to-face'), 292);
  assert.equal(valueOf(model, 'RF/RTJ Weight'), 144);
  assert.equal(model.sourceAudit.source, 'docs/Pipedata/Database/Vlfl/VLV1150.csv');
  assert.equal(model.sourceAudit.sourceRowNumber, 16);
});

test('UI Studio: exact search rejects partial text and wrong class fallback', () => {
  const partial = componentSearch('gate valve', searchIndex, { aliases, mode: SEARCH_MODE.EXACT_ALIAS_ONLY });
  assert.equal(partial.ok, false);

  const wrongClass = studio('gate valve 8 class 300 rf', { ...EXACT_VALVE_8_150_RF, classRating: '300' });
  assert.equal(wrongClass.search.ok, false);
  assert.equal(wrongClass.search.selectedId, null);
  assert.equal(wrongClass.selector.noFallbackPolicy.includes('nearest'), true);
});

test('UI Studio: complete structured filters can select an exact component without fallback', () => {
  const result = componentSearch('', searchIndex, {
    aliases,
    mode: SEARCH_MODE.EXACT_ALIAS_ONLY,
    filters: EXACT_VALVE_8_150_RF,
  });
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

  const stale = componentSearch('RTJ GASKET 4 300', searchIndex, { aliases, mode: SEARCH_MODE.EXACT_ALIAS_ONLY });
  assert.equal(stale.ok, false);
});

test('UI Studio: coverage dashboard is static audit data only', () => {
  assert.equal(coverage.schema, 'pipedata-db-coverage-dashboard/v1');
  assert.equal(coverage.policy.noFabrication, true);
  assert.equal(coverage.policy.noEngineeringFallback, true);
  assert.equal(coverage.summary.missingCatalogRows, 0);
  assert.equal(coverage.ok, true);
});

test('UI Studio: release banner exposes foundation status without raw source tree', () => {
  const html = fs.readFileSync('studio/index.html', 'utf8');
  assert.equal(readiness.status, 'FOUNDATION_READY');
  assert.equal(readiness.productionComplete, false);
  assert.equal(integration.status, 'STABLE_FOUNDATION_CONTRACT');
  assert.match(html, /Source-backed foundation release · not production-complete/);
  assert.match(html, /Integration contract: stable exact lookup API/);
  assert.match(html, /release-readiness\.json/);
  assert.match(html, /integration-contract\.manifest\.json/);
  assert.doesNotMatch(html, /docs\/Pipedata\/Database/);
});

test('UI Studio: visible dashboard, family browser, detail drawer and provenance panel are present', () => {
  const html = fs.readFileSync('studio/index.html', 'utf8');
  const css = fs.readFileSync('studio/studio.css', 'utf8');
  assert.match(html, /Catalog dashboard/);
  assert.match(html, /dashboard-cards/);
  assert.match(html, /Catalog Browser/);
  assert.match(html, /component-table-body/);
  assert.match(html, /component-detail/);
  assert.match(html, /provenance-panel/);
  assert.match(html, /copy-id-button/);
  assert.match(css, /dashboard-cards/);
  assert.match(css, /catalog-table/);
  assert.match(css, /detail-drawer/);
  assert.match(css, /@media \(max-width: 640px\)/);
});

test('UI Studio: static shell exposes selector, data, preview, audit and verification regions', () => {
  const html = fs.readFileSync('studio/index.html', 'utf8');
  const js = fs.readFileSync('studio/component-studio-app.js', 'utf8');
  assert.match(html, /Component Selector/);
  assert.match(html, /Component Data/);
  assert.match(html, /CAD Preview/);
  assert.match(html, /Source Audit/);
  assert.match(html, /verification-footer/);
  assert.match(js, /db-coverage-dashboard\.json/);
  assert.match(js, /Coverage only/);
  assert.match(js, /No values promoted/);
  assert.match(js, /noFallbackPolicy/);
  assert.match(js, /RTJ GASKET/);
  assert.match(js, /tableEntriesForState/);
  assert.match(js, /renderComponentTable/);
  assert.match(js, /renderProvenancePanel/);
  assert.doesNotMatch(js, /RTJ GASKET 4 300/);
  assert.doesNotMatch(js, /VALVE\|GATE\|FLANGED\|NPS8\|CL150\|RF/);
  assert.doesNotMatch(js, /VLV1150/);
  assert.doesNotMatch(js, /Source:\s*<code>/);
});

test('UI Studio: Pages artifact workflow publishes minimal JSON and blocks raw DB tree', () => {
  const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /cp data\/normalized\/\*\.json _site\/data\/normalized\//);
  assert.match(workflow, /cp data\/audit\/\*\.json _site\/data\/audit\//);
  assert.match(workflow, /test -f _site\/data\/audit\/db-coverage-dashboard\.json/);
  assert.match(workflow, /Raw source database tree must not be published to Pages/);
  assert.match(workflow, /studio\.css\?v=/);
  assert.match(workflow, /component-studio-app\.js\?v=/);
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
  assert.ok(lineCount('gates/ui-browser-smoke.gate.test.js') <= 320);
});

function valueOf(model, label) {
  return model.dataPanel.attributes.find((item) => item.label === label)?.value;
}

function lineCount(path) {
  return fs.readFileSync(path, 'utf8').trim().split('\n').length;
}
