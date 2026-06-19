import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPipeSpecSvgAudit,
  getPipeSpecSvgKey,
  getPipeSpecSvgQuality,
  hasPipeSpecSvgSupport,
  PIPE_SPEC_SVG_SUPPORTED_TYPES,
  toPipeSpecSvgRow,
} from '../pipetools/js/svg/pipeSpecSvgAdapter.js';

const supported = [
  { componentType: 'PIPE', nps: '2', schedule: '40', odMm: 60.3 },
  { componentType: 'VALVE', valveType: 'GATE', nps: '2', classRating: '150', facing: 'RF' },
  { componentType: 'VALVE', valveType: 'GLOBE', nps: '2', classRating: '150', facing: 'RF' },
  { componentType: 'VALVE', valveType: 'BALL', nps: '2', classRating: '150', facing: 'RF' },
  { componentType: 'VALVE', valveType: 'SWING_CHECK', nps: '2', classRating: '150', facing: 'RF' },
  { componentType: 'VALVE', valveType: 'WAFER_CHECK', endType: 'WAFER', nps: '2', classRating: '150', facing: 'NA' },
  { componentType: 'VALVE', valveType: 'BUTTERFLY_WAFER', endType: 'WAFER', nps: '2', classRating: '150', facing: 'NA' },
  { componentType: 'VALVE', valveType: 'CONTROL', nps: '2', classRating: '150', facing: 'RF' },
  { componentType: 'REDUCER', reducerType: 'CONCENTRIC', largeNps: '4', smallNps: '2', schedule: '40' },
  { componentType: 'REDUCER', reducerType: 'ECCENTRIC', largeNps: '4', smallNps: '2', schedule: '40' },
  { componentType: 'FITTING', subtype: 'ELBOW_90', nps: '4', schedule: '40' },
  { componentType: 'FITTING', subtype: 'TEE_REDUCING', nps: '4', schedule: '40' },
  { componentType: 'OLET', oletType: 'WELDOLET', runNps: '6', branchNps: '2' },
  { componentType: 'OLET', oletType: 'SOCKOLET', runNps: '6', branchNps: '2' },
];

test('audited DB2 component families use explicit templates, not generic fallback', () => {
  for (const row of supported) {
    const normalized = toPipeSpecSvgRow(row);
    const quality = getPipeSpecSvgQuality(row);
    assert.equal(quality.renderable, true, `${getPipeSpecSvgKey(row)} should render`);
    assert.equal(hasPipeSpecSvgSupport(row), true, `${getPipeSpecSvgKey(row)} support flag should be true`);
    assert.notEqual(normalized.valveType ?? normalized.reducerType ?? normalized.subtype ?? normalized.oletType, 'UNKNOWN_VALVE');
    assert.notEqual(normalized.valveType ?? normalized.reducerType ?? normalized.subtype ?? normalized.oletType, 'UNKNOWN_REDUCER');
    assert.notEqual(normalized.valveType ?? normalized.reducerType ?? normalized.subtype ?? normalized.oletType, 'UNKNOWN_FITTING');
    assert.notEqual(normalized.valveType ?? normalized.reducerType ?? normalized.subtype ?? normalized.oletType, 'UNKNOWN_OLET');
  }
});

test('DB2 source filenames infer component subtype when rows omit explicit subtype', () => {
  const swing = toPipeSpecSvgRow({ componentType: 'VALVE', source: 'data/normalized/valves-swingcheck-expanded.json' });
  const waferCheck = toPipeSpecSvgRow({ componentType: 'VALVE', valveType: 'WAFER_CHECK', source: 'data/normalized/valves-wafer-expanded.json' });
  const butterfly = toPipeSpecSvgRow({ componentType: 'VALVE', valveType: 'BUTTERFLY_WAFER', source: 'data/normalized/valves-wafer-expanded.json' });
  const olet = toPipeSpecSvgRow({ componentType: 'OLET', source: 'data/normalized/olets-weldolet.json' });
  assert.equal(swing.valveType, 'SWING_CHECK');
  assert.equal(waferCheck.valveType, 'WAFER_CHECK');
  assert.equal(butterfly.valveType, 'BUTTERFLY');
  assert.equal(olet.oletType, 'WELDOLET');
  assert.equal(getPipeSpecSvgQuality(swing).renderable, true);
  assert.equal(getPipeSpecSvgQuality(waferCheck).renderable, true);
  assert.equal(getPipeSpecSvgQuality(butterfly).renderable, true);
  assert.equal(getPipeSpecSvgQuality(olet).renderable, true);
});

test('unsupported valve and support types remain blocked with explicit audit action', () => {
  const valve = { componentType: 'VALVE', valveType: 'NEEDLE', nps: '1' };
  const support = { componentType: 'SUPPORT', supportKind: 'SHOE' };
  for (const row of [valve, support]) {
    const quality = getPipeSpecSvgQuality(row);
    const audit = getPipeSpecSvgAudit(row);
    assert.equal(hasPipeSpecSvgSupport(row), false);
    assert.equal(quality.status, 'MISSING_TEMPLATE');
    assert.equal(audit.renderable, false);
    assert.match(audit.nextAction, /Create dedicated template/i);
  }
});

test('supported type registry matches DB2 first-pass component audit', () => {
  assert.deepEqual(PIPE_SPEC_SVG_SUPPORTED_TYPES.reducers, ['CONCENTRIC', 'ECCENTRIC']);
  for (const valve of ['GATE', 'GLOBE', 'BALL', 'SWING_CHECK', 'CHECK', 'WAFER_CHECK', 'BUTTERFLY', 'CONTROL']) assert.ok(PIPE_SPEC_SVG_SUPPORTED_TYPES.valves.includes(valve), `${valve} should be registered`);
  for (const fitting of ['ELBOW_90', 'ELBOW_45', 'TEE_STRAIGHT', 'TEE_REDUCING', 'CROSS', 'CAP']) assert.ok(PIPE_SPEC_SVG_SUPPORTED_TYPES.fittings.includes(fitting), `${fitting} should be registered`);
  for (const olet of ['WELDOLET', 'SOCKOLET', 'THREDOLET', 'ELBOLET']) assert.ok(PIPE_SPEC_SVG_SUPPORTED_TYPES.olets.includes(olet), `${olet} should be registered`);
});
