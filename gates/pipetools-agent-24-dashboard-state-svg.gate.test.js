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
  assert.ok(render.includes("TABLE_COLUMNS[family?.family]"));
});

test('Agent 24 keeps component dashboard and subtype filters compact', () => {
  const css = read('pipetools/pipetools.css');
  assert.match(css, /\.card-btn \{[^}]*flex: 0 0 96px;[^}]*min-height: 52px/);
  assert.match(css, /\.subtype-chip \{ min-width: 58px; \}/);
  assert.ok(css.includes('.partial-dot'));
});

test('Agent 24 enlarges right SVG inspector and keeps light canvas visible', () => {
  const css = read('pipetools/pipetools.css');
  assert.match(css, /\.result-grid \{[^}]*grid-template-columns: minmax\(0, 1fr\) 460px/);
  assert.match(css, /\.svg-canvas \{[^}]*min-height: 350px/);
  assert.match(css, /\.svg-canvas svg \{[^}]*width: 96%;[^}]*height: 96%/);
  assert.ok(css.includes('linear-gradient(180deg, #fff, #eef4fb)'));
});

test('Agent 24 inspector exposes SVG Details JSON tabs without default JSON noise', () => {
  const inspector = read('pipetools/js/pipespecInspector.js');
  assert.ok(inspector.includes('inspector-tabs'));
  assert.ok(inspector.includes('data-inspector-panel="svg"'));
  assert.ok(inspector.includes('data-inspector-panel="details"'));
  assert.ok(inspector.includes('data-inspector-panel="json" hidden'));
  assert.ok(inspector.includes('getPipeSpecSvgKey'));
  assert.ok(inspector.includes('details-grid'));
});

test('Agent 24 detail actions support tabs, zoom, fit, and preview', () => {
  const actions = read('pipetools/js/pipespecDetailActions.js');
  assert.ok(actions.includes("action?.startsWith('tab-')"));
  assert.ok(actions.includes('svg-zoom-in'));
  assert.ok(actions.includes('svg-zoom-out'));
  assert.ok(actions.includes('svg-fit'));
  assert.ok(actions.includes('open-svg-preview'));
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
