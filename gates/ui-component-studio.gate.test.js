import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createComponentStudioModel } from '../src/index.js';
import { componentSearch, SEARCH_MODE } from '../src/db/componentSearch.js';

const searchIndex = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));
const aliases = JSON.parse(fs.readFileSync('data/search/component-aliases.json', 'utf8'));
const valves = JSON.parse(fs.readFileSync('data/normalized/valves.json', 'utf8'));

function studio(query = 'gate valve 8 class 150 rf', filters = { componentType: 'VALVE', classRating: '150', nps: '8' }) {
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

  const wrongClass = studio('gate valve 8 class 300 rf', { componentType: 'VALVE', classRating: '300', nps: '8' });
  assert.equal(wrongClass.search.ok, false);
  assert.equal(wrongClass.search.selectedId, null);
  assert.equal(wrongClass.selector.noFallbackPolicy.includes('nearest'), true);
});

test('UI Studio: complete structured filters can select an exact component without fallback', () => {
  const result = componentSearch('', searchIndex, {
    aliases,
    mode: SEARCH_MODE.EXACT_ALIAS_ONLY,
    filters: { componentType: 'VALVE', valveType: 'GATE', nps: '8', classRating: '150', facing: 'RF' },
  });
  assert.equal(result.ok, true);
  assert.equal(result.results[0].id, 'VALVE|GATE|FLANGED|NPS8|CL150|RF');
});

test('UI Studio: static shell exposes selector, data, preview, audit and verification regions', () => {
  const html = fs.readFileSync('studio/index.html', 'utf8');
  const js = fs.readFileSync('studio/component-studio-app.js', 'utf8');
  assert.match(html, /Component Selector/);
  assert.match(html, /Component Data/);
  assert.match(html, /CAD Preview/);
  assert.match(html, /Source Audit/);
  assert.match(html, /verification-footer/);
  assert.match(js, /noFallbackPolicy/);
  assert.doesNotMatch(js, /VALVE\|GATE\|FLANGED\|NPS8\|CL150\|RF/);
  assert.doesNotMatch(js, /VLV1150/);
  assert.doesNotMatch(js, /Source:\s*<code>/);
});

test('UI Studio: Pages artifact workflow publishes minimal JSON and blocks raw DB tree', () => {
  const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /cp data\/normalized\/\*\.json _site\/data\/normalized\//);
  assert.match(workflow, /Raw source database tree must not be published to Pages/);
  assert.match(workflow, /studio\.css\?v=/);
  assert.match(workflow, /component-studio-app\.js\?v=/);
});

test('UI Studio: model and gate stay small', () => {
  assert.ok(lineCount('src/ui/createComponentStudioModel.js') <= 200);
  assert.ok(lineCount('gates/ui-component-studio.gate.test.js') <= 200);
});

function valueOf(model, label) {
  return model.dataPanel.attributes.find((item) => item.label === label)?.value;
}

function lineCount(path) {
  return fs.readFileSync(path, 'utf8').trim().split('\n').length;
}
