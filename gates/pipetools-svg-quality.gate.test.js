import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import {
  getPipeSpecSvgAudit,
  getPipeSpecSvgKey,
  getPipeSpecSvgQuality,
  hasPipeSpecSvgSupport,
  PIPE_SPEC_SVG_SUPPORTED_TYPES,
  toPipeSpecSvgRow,
} from '../pipetools/js/svg/pipeSpecSvgAdapter.js';
import { PIPE_SPEC_SVG_FIXTURES } from '../pipetools/js/svg/pipeSpecSvgFixtures.js';

const require = createRequire(import.meta.url);
const PipeSpecSVG = require('../pipetools/vendor/pipespec-svg/svg-engine.js');

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

function normalizedType(row) {
  const normalized = toPipeSpecSvgRow(row);
  return normalized.valveType ?? normalized.reducerType ?? normalized.subtype ?? normalized.oletType ?? normalized.componentType;
}

test('audited DB2 component families use explicit templates, not generic fallback', () => {
  for (const row of supported) {
    const quality = getPipeSpecSvgQuality(row);
    assert.equal(quality.renderable, true, `${getPipeSpecSvgKey(row)} should render`);
    assert.equal(hasPipeSpecSvgSupport(row), true, `${getPipeSpecSvgKey(row)} support flag should be true`);
    assert.doesNotMatch(normalizedType(row), /^UNKNOWN_/);
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
  for (const row of [swing, waferCheck, butterfly, olet]) assert.equal(getPipeSpecSvgQuality(row).renderable, true);
});

test('unsupported valve and support types remain blocked with explicit audit action', () => {
  for (const row of [{ componentType: 'VALVE', valveType: 'NEEDLE', nps: '1' }, { componentType: 'SUPPORT', supportKind: 'SHOE' }]) {
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

test('visual fixture catalog covers every supported SVG subtype and blocks pending shapes', () => {
  assert.ok(PIPE_SPEC_SVG_FIXTURES.length >= 28, 'fixture catalog should cover DB2 visual audit scope');
  for (const fixture of PIPE_SPEC_SVG_FIXTURES) {
    const audit = getPipeSpecSvgAudit(fixture.row);
    assert.equal(audit.status, fixture.expected.status, `${fixture.id} status should match catalog`);
    assert.equal(audit.renderable, fixture.expected.renderable, `${fixture.id} renderability should match catalog`);
    assert.equal(normalizedType(fixture.row), fixture.expected.type, `${fixture.id} normalized type should match catalog`);
  }
});

test('renderable visual fixtures produce real SVG, never unknown fallback text', () => {
  for (const fixture of PIPE_SPEC_SVG_FIXTURES.filter((item) => item.expected.renderable)) {
    const normalized = toPipeSpecSvgRow(fixture.row);
    const svg = PipeSpecSVG.buildSVGString(normalized, { width: 390, height: 262 });
    assert.match(svg, /<svg\b/i, `${fixture.id} should produce SVG markup`);
    assert.doesNotMatch(svg, /No drawing available/i, `${fixture.id} must not use unknown fallback`);
    assert.match(svg, new RegExp(fixture.expected.type.replaceAll('_', '[ _]'), 'i'), `${fixture.id} should include fixture type in title/labels`);
  }
});
