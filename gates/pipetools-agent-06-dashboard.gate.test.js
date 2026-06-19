import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { applySearchToRows } from '../pipetools/js/search/search.js';
import { applySearchResultToState, resolveInspectorSvg, resolveSvgKey, runPipeSpecSearch } from '../pipetools/js/pipespecAdapters.js';
import { filterPipeSpecRows, getDashboardCounts, isFacingApplicable } from '../pipetools/js/pipespecFilters.js';
import { renderPipeSpecInspector } from '../pipetools/js/pipespecInspector.js';
import { actionFromFilterKey, createInitialPipeSpecState, reducePipeSpecState } from '../pipetools/js/pipespecState.js';
import { hasSvgRenderer } from '../pipetools/js/svg/registry.js';

const rows = [
  valve('r1', 'GATE', 'FLANGED', 'RF', '150', '6'),
  valve('r2', 'GATE', 'FLANGED', 'RTJ', '150', '6'),
  valve('r3', 'GATE', 'BUTT-WELD', '', '150', '6'),
  valve('r4', 'GLOBE', 'FLANGED', 'RF', '300', '8'),
  valve('r5', 'GATE', 'FLANGED', 'RF', '300', '8'),
];

const sourceFiles = [
  'pipetools/js/app.js',
  'pipetools/js/render.js',
  'pipetools/js/pipespecAdapters.js',
  'pipetools/js/pipespecDashboard.js',
  'pipetools/js/pipespecFilters.js',
  'pipetools/js/pipespecInspector.js',
  'pipetools/js/pipespecState.js',
  'pipetools/js/pipespecTable.js',
  'gates/pipetools-agent-06-dashboard.gate.test.js',
];

test('Agent 06 modules stay below 200 lines', () => {
  for (const file of sourceFiles) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= 200, `${file} has ${lines} lines`);
  }
});

test('component and end-type changes clear invalid child selections', () => {
  let state = createInitialPipeSpecState({ filters: { component: 'VALVE', subtype: 'GATE', endType: 'FLANGED', facing: 'RTJ', classRating: '150' }, selectedRowId: 'r2', rows });
  state = reducePipeSpecState(state, { type: 'SET_END_TYPE', value: 'BUTT-WELD' });
  assert.equal(state.filters.facing, null);
  assert.equal(state.selectedRowId, null);
  state = reducePipeSpecState(state, { type: 'SET_COMPONENT', value: 'PIPE' });
  assert.equal(state.filters.subtype, null);
  assert.equal(state.filters.endType, null);
  assert.equal(state.filters.classRating, null);
});

test('Gate + Flanged + RF + CL150 filters rows and selected id resolves', () => {
  const filters = { component: 'VALVE', subtype: 'GATE', endType: 'FLANGED', facing: 'RF', classRating: '150' };
  const visible = filterPipeSpecRows(rows, filters);
  assert.deepEqual(visible.map((row) => row.id), ['r1']);
  const selected = reducePipeSpecState(createInitialPipeSpecState({ filters, selectedRowId: 'r1', rows }), { type: 'ROWS_CHANGED', rows: visible });
  assert.equal(selected.selectedRowId, 'r1');
});

test('dashboard counts and facing applicability are deterministic', () => {
  const counts = getDashboardCounts(rows, { component: 'VALVE', subtype: 'GATE' });
  assert.equal(counts.endTypes.FLANGED, 3);
  assert.equal(counts.endTypes['BUTT-WELD'], 1);
  assert.equal(isFacingApplicable({ endType: 'FLANGED', facing: 'RF' }), true);
  assert.equal(isFacingApplicable({ endType: 'BUTT-WELD', facing: 'RF' }), false);
});

test('Agent 04 search API updates dashboard state', () => {
  const direct = applySearchToRows('GATE 8" FL 300#', rows);
  const viaAdapter = runPipeSpecSearch('GATE 8" FL 300#', rows);
  assert.deepEqual(viaAdapter.parsed.filters, direct.parsed.filters);
  const state = applySearchResultToState(createInitialPipeSpecState(), viaAdapter);
  assert.equal(state.filters.subtype, 'GATE');
  assert.equal(state.filters.endType, 'FLANGED');
  assert.equal(state.filters.classRating, '300');
  assert.equal(state.filters.nps, '8');
  assert.ok(state.searchChips.length > 0);
});

test('Agent 05 SVG registry renders selected row preview', () => {
  assert.equal(resolveSvgKey(rows[0]), 'VALVE_GATE_FLANGED_RF');
  assert.equal(hasSvgRenderer(resolveSvgKey(rows[0])), true);
  assert.match(resolveInspectorSvg(rows[0]), /<svg/i);
  assert.match(renderPipeSpecInspector(rows[0]), /GATE/);
});

test('dashboard render binds events without invoking filters during render', () => {
  const text = fs.readFileSync('pipetools/js/render.js', 'utf8');
  assert.match(text, /addEventListener\('click'/);
  assert.doesNotMatch(text, /forEach\(\(button\) => actions\.setFilter/);
});

test('CI workflows preserve cumulative PipeTools gates', () => {
  for (const file of ['.github/workflows/pipetools-ci.yml', '.github/workflows/pages.yml']) {
    const text = fs.readFileSync(file, 'utf8');
    for (const gate of ['00-03', '04-search', '05-svg', '06-dashboard']) {
      assert.match(text, new RegExp(`pipetools-agent-${gate}\.gate\.test\.js`), `${file} missing ${gate}`);
    }
  }
});

test('filter action mapping supports existing UI keys', () => {
  assert.deepEqual(actionFromFilterKey('valveType', 'GLOBE'), { type: 'SET_SUBTYPE', value: 'GLOBE' });
  assert.deepEqual(actionFromFilterKey('classRating', '300'), { type: 'SET_CLASS', value: '300' });
});

function valve(id, valveType, endType, facing, classRating, nps) {
  return {
    id, componentType: 'VALVE', valveType, endType, facing, classRating, nps, dn: Number(nps) * 25,
    dimensions: { faceToFaceRfMm: { value: 267 }, faceToFaceRtjMm: { value: 280 }, heightMm: { value: 767 } },
    weights: { rfRtjKg: { value: 88 } }, dataStatus: 'READY',
  };
}
