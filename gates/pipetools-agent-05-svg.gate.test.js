import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { iconSvg, listIconKeys } from '../pipetools/js/svg/icons.js';
import { renderSvgPreview } from '../pipetools/js/svg/inspector.js';
import { pipeSpanSvg } from '../pipetools/js/svg/pipeSpan.js';
import { hasSvgRenderer, listSvgKeys, resolveSvgKey } from '../pipetools/js/svg/registry.js';

const REQUIRED_KEYS = [
  'VALVE_GATE_FLANGED_RF', 'VALVE_GATE_FLANGED_RTJ', 'VALVE_GATE_BUTT_WELD_NA',
  'VALVE_GLOBE_FLANGED_RF', 'VALVE_CHECK_FLANGED_RF', 'FLANGE_WN_RF',
  'FLANGE_WN_RTJ', 'FLANGE_BLIND_RF', 'FITTING_ELBOW_90_LR', 'FITTING_TEE_EQUAL',
  'PIPE_STRAIGHT', 'SUPPORT_GUIDE', 'SUPPORT_LINE_STOP',
];
const MODULE_ROOT = new URL('../pipetools/js/svg', import.meta.url).pathname;
const MAX_NATIVE_MODULE_LINES = 300;

function maliciousText() {
  return '<' + '/text>' + '<' + 'foreignObject>' + 'bad' + '<' + '/foreignObject>';
}

test('Agent 05 SVG registry exposes required first-wave keys', () => {
  const keys = listSvgKeys();
  for (const key of REQUIRED_KEYS) assert.ok(keys.includes(key), `${key} missing`);
  for (const key of REQUIRED_KEYS) assert.equal(hasSvgRenderer(key), true, `${key} unresolved`);
});

test('row variants resolve to stable SVG keys', () => {
  assert.equal(resolveSvgKey({ componentType: 'VALVE', valveType: 'GATE', endType: 'FLANGED', facing: 'RF' }), 'VALVE_GATE_FLANGED_RF');
  assert.equal(resolveSvgKey({ componentType: 'VALVE', valveType: 'GATE', endType: 'BUTT-WELD', facing: 'RTJ' }), 'VALVE_GATE_BUTT_WELD_NA');
  assert.equal(resolveSvgKey({ componentType: 'FLANGE', type: 'WN', facing: 'RTJ' }), 'FLANGE_WN_RTJ');
  assert.equal(resolveSvgKey({ componentType: 'PIPE' }), 'PIPE_STRAIGHT');
});

test('rendered SVG previews are safe and include dynamic dimensions', () => {
  const row = { componentType: 'VALVE', valveType: 'GATE', endType: 'FLANGED', facing: 'RF', dimensions: { faceToFaceRfMm: { value: 267 }, heightMm: { value: 767 } } };
  const svg = renderSvgPreview(row);
  assert.match(svg, /F2F RF: 267 mm/);
  assert.match(svg, /H 767 mm/);
  assert.doesNotMatch(svg, /foreignObject|on\w+=|java\s*script/i);
});

test('malicious dynamic SVG text is escaped before rendering', () => {
  const payload = maliciousText();
  const row = { svgKey: 'VALVE_GATE_FLANGED_RF', facing: payload, dimensions: { faceToFaceRfMm: { value: payload }, heightMm: { value: payload } } };
  const svg = renderSvgPreview(row);
  assert.match(svg, /&lt;\/text&gt;&lt;foreignObject&gt;bad&lt;\/foreignObject&gt;/);
  assert.doesNotMatch(svg, /<foreignObject>|<\/text><foreignObject>/i);
  const fallback = renderSvgPreview({ svgKey: payload });
  assert.match(fallback, /&lt;\/text&gt;&lt;foreignObject&gt;bad&lt;\/foreignObject&gt;/);
  assert.doesNotMatch(fallback, /<foreignObject>/i);
  const span = pipeSpanSvg({ governingSpanM: '<' + 'bad' + '>' });
  assert.match(span, /Pipe Span Engineering Sketch|Pipe span engineering sketch/);
  assert.doesNotMatch(span, /<bad>|&lt;bad&gt;|foreignObject|on\w+=|java\s*script/i);
});

test('dashboard icons and fallback SVG are available', () => {
  for (const key of ['PIPE', 'VALVE', 'FLANGE', 'FITTING', 'GASKET', 'SUPPORT']) {
    assert.ok(listIconKeys().includes(key));
    assert.match(iconSvg(key), /<svg/);
  }
  assert.match(renderSvgPreview({ svgKey: 'MISSING_KEY' }), /SVG not available/);
});

test('new SVG modules respect the relaxed 300-line module limit', () => {
  const files = collectJsFiles(MODULE_ROOT).concat([new URL('../pipetools/js/svg.js', import.meta.url).pathname]);
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n').length;
    assert.ok(lines <= MAX_NATIVE_MODULE_LINES, `${file} has ${lines} lines`);
  }
});

function collectJsFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? collectJsFiles(path) : path.endsWith('.js') ? [path] : [];
  });
}
