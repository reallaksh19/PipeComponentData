import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPipeSpecSvgKey,
  getPipeSpecSvgQuality,
  hasPipeSpecSvgSupport,
  PIPE_SPEC_SVG_SUPPORTED_TYPES,
  toPipeSpecSvgRow,
} from '../pipetools/js/svg/pipeSpecSvgAdapter.js';

const supported = [
  { componentType: 'VALVE', valveType: 'GATE', nps: '2', classRating: '150', facing: 'RF' },
  { componentType: 'VALVE', valveType: 'GLOBE', nps: '2', classRating: '150', facing: 'RF' },
  { componentType: 'VALVE', valveType: 'BALL', nps: '2', classRating: '150', facing: 'RF' },
  { componentType: 'VALVE', valveType: 'SWING_CHECK', nps: '2', classRating: '150', facing: 'RF' },
  { componentType: 'VALVE', valveType: 'WAFER', nps: '2', classRating: '150', facing: 'RF' },
  { componentType: 'REDUCER', reducerType: 'CONCENTRIC', largeNps: '4', smallNps: '2', schedule: '40' },
  { componentType: 'REDUCER', reducerType: 'ECCENTRIC', largeNps: '4', smallNps: '2', schedule: '40' },
];

test('supported valve and reducer families use component templates, not generic fallback', () => {
  for (const row of supported) {
    const normalized = toPipeSpecSvgRow(row);
    const quality = getPipeSpecSvgQuality(row);
    assert.equal(quality.status, 'COMPONENT_TEMPLATE', `${getPipeSpecSvgKey(row)} should be component-specific`);
    assert.equal(quality.renderable, true, `${getPipeSpecSvgKey(row)} should render`);
    assert.equal(hasPipeSpecSvgSupport(row), true, `${getPipeSpecSvgKey(row)} support flag should be true`);
    assert.notEqual(normalized.valveType ?? normalized.reducerType, 'UNKNOWN_VALVE');
    assert.notEqual(normalized.valveType ?? normalized.reducerType, 'UNKNOWN_REDUCER');
  }
});

test('DB2 source filenames can infer valve type when the row omits explicit subtype', () => {
  const swing = toPipeSpecSvgRow({ componentType: 'VALVE', source: 'data/normalized/valves-swingcheck-expanded.json' });
  const wafer = toPipeSpecSvgRow({ componentType: 'VALVE', source: 'data/normalized/valves-wafer-expanded.json' });
  assert.equal(swing.valveType, 'SWING_CHECK');
  assert.equal(wafer.valveType, 'BUTTERFLY');
  assert.equal(getPipeSpecSvgQuality(swing).status, 'COMPONENT_TEMPLATE');
  assert.equal(getPipeSpecSvgQuality(wafer).status, 'COMPONENT_TEMPLATE');
});

test('unsupported valve types remain blocked with an explicit missing-template reason', () => {
  const row = { componentType: 'VALVE', valveType: 'NEEDLE', nps: '1' };
  const quality = getPipeSpecSvgQuality(row);
  assert.equal(hasPipeSpecSvgSupport(row), false);
  assert.equal(quality.status, 'MISSING_TEMPLATE');
  assert.match(quality.reason, /no generic valve fallback/i);
});

test('supported type registry includes the first DB2 SVG-quality wave', () => {
  assert.deepEqual(PIPE_SPEC_SVG_SUPPORTED_TYPES.reducers, ['CONCENTRIC', 'ECCENTRIC']);
  for (const valve of ['GATE', 'GLOBE', 'BALL', 'SWING_CHECK', 'CHECK', 'BUTTERFLY']) {
    assert.ok(PIPE_SPEC_SVG_SUPPORTED_TYPES.valves.includes(valve), `${valve} should be registered`);
  }
});
