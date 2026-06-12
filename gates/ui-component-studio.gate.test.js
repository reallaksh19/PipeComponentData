import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createComponentStudioModel } from '../src/index.js';

const searchIndex = JSON.parse(fs.readFileSync('data/indexes/component-search.index.json', 'utf8'));
const aliases = JSON.parse(fs.readFileSync('data/search/component-aliases.json', 'utf8'));
const valves = JSON.parse(fs.readFileSync('data/normalized/valves.json', 'utf8'));

function studio(query = 'gate valve 8 class 150 rf') {
  return createComponentStudioModel({
    query,
    searchIndex,
    aliases,
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

test('UI Studio: wrong class query does not fall back to nearest valve', () => {
  const model = createComponentStudioModel({
    query: 'gate valve 8 class 300 rf',
    searchIndex,
    aliases,
    filters: { componentType: 'VALVE', classRating: '300' },
    catalogs: { VALVE: valves.rows },
  });
  assert.equal(model.search.ok, false);
  assert.equal(model.search.selectedId, null);
  assert.equal(model.selector.noFallbackPolicy.includes('nearest'), true);
});

test('UI Studio: static shell exposes selector, data, preview, audit and verification regions', () => {
  const html = fs.readFileSync('studio/index.html', 'utf8');
  const js = fs.readFileSync('studio/component-studio-app.js', 'utf8');
  assert.match(html, /Component Selector/);
  assert.match(html, /Component Data/);
  assert.match(html, /CAD 3D Preview/);
  assert.match(html, /Source Audit/);
  assert.match(html, /verification-footer/);
  assert.match(js, /noFallbackPolicy/);
  assert.match(js, /VLV1150/);
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
