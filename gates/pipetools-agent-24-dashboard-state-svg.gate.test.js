import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('Agent 24 uses registry-style dynamic table columns by component', () => {
  const render = read('pipetools/js/render.js');
  assert.ok(render.includes('const TABLE_COLUMNS'));
  for (const family of ['PIPE', 'VALVE', 'FLANGE', 'FITTING', 'GASKET', 'SUPPORT', 'REDUCER', 'OLET']) {
    assert.ok(render.includes(`${family}: [`), `${family} table columns missing`);
  }
  assert.ok(render.includes('getDashboardCounts'));
  assert.ok(render.includes('TABLE_COLUMNS[family?.family]'));
});

test('Agent 24 keeps component dashboard and subtype filters compact', () => {
  const css = read('pipetools/pipetools.css');
  assert.match(css, /\.card-btn \{[^}]*flex: 0 0 96px;[^}]*min-height: 52px/);
  assert.match(css, /\.subtype-chip \{ min-width: 58px; \}/);
  assert.ok(css.includes('.partial-dot'));
});

test('Agent 24 places the source SVG in the centre canvas at reduced scale', () => {
  const css = read('pipetools/pipetools.css');
  const render = read('pipetools/js/render.js');
  const html = read('pipetools/index.html');
  assert.ok(css.includes('grid-template-columns: minmax(360px, .78fr) minmax(520px, 1.35fr) 340px'));
  assert.ok(css.includes('.source-svg-canvas'));
  assert.ok(css.includes('linear-gradient(180deg, #fff, #eef4fb)'));
  assert.ok(render.includes('const SVG_FIT_SCALE = 0.5625'));
  assert.ok(render.includes('data-pipespec-source-svg-host="true"'));
  assert.ok(html.includes('source-svg-panel'));
});

test('Agent 24 right inspector is metadata and JSON only', () => {
  const inspector = read('pipetools/js/pipespecInspector.js');
  assert.ok(inspector.includes('inspector-tabs'));
  assert.ok(inspector.includes('data-inspector-panel="details"'));
  assert.ok(inspector.includes('data-inspector-panel="json" hidden'));
  assert.ok(inspector.includes('getPipeSpecSvgKey'));
  assert.ok(inspector.includes('details-grid'));
  assert.equal(inspector.includes('data-inspector-panel="svg"'), false);
  assert.equal(inspector.includes('data-pipespec-svg-host'), false);
});

test('Agent 24 detail actions support centre SVG fit, zoom, and preview', () => {
  const actions = read('pipetools/js/pipespecDetailActions.js');
  assert.ok(actions.includes("action?.startsWith('tab-')"));
  assert.ok(actions.includes('svg-zoom-in'));
  assert.ok(actions.includes('svg-fit'));
  assert.ok(actions.includes('open-svg-preview'));
  assert.ok(actions.includes('data-pipespec-source-svg-host'));
});

test('Agent 24 SVG resolver emits deterministic component route keys', () => {
  const adapter = read('pipetools/js/svg/pipeSpecSvgAdapter.js');
  assert.ok(adapter.includes('export function getPipeSpecSvgKey'));
  assert.ok(adapter.includes("['VALVE', normalized.valveType, normalized.endType, normalized.facing ?? 'NA'].join('_')"));
  assert.ok(adapter.includes("['FLANGE', normalized.subtype, normalized.facing ?? 'NA', `CL${normalized.classRating}`].join('_')"));
});

test('Agent 24 manifest records no vendor SVG rewrite', () => {
  const manifest = read('data/audit/pipetools-agent-24-dashboard-state-svg-manifest.json');
  assert.ok(manifest.includes('svgEngineChanged'));
  assert.ok(manifest.includes('false'));
  assert.ok(manifest.includes('unsupportedFamiliesUseNoFallback'));
});
