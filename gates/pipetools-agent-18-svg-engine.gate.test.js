import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { hasPipeSpecSvgSupport, toPipeSpecSvgRow } from '../pipetools/js/svg/pipeSpecSvgAdapter.js';

const manifest = JSON.parse(fs.readFileSync('data/audit/pipetools-agent-18-svg-engine-manifest.json', 'utf8'));
const enginePath = 'pipetools/vendor/pipespec-svg/svg-engine.js';
const engineSource = fs.readFileSync(enginePath, 'utf8');

function lineCount(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

function loadEngine() {
  const context = { module: { exports: {} }, exports: {} };
  vm.createContext(context);
  vm.runInContext(engineSource, context, { filename: enginePath });
  return context.module.exports;
}

test('Agent 18 vendors uploaded PipeSpec SVG source package', () => {
  assert.equal(manifest.schema, 'pipetools-agent-18-svg-engine/v1');
  for (const file of manifest.vendorFiles) assert.ok(fs.existsSync(file), `${file} missing`);
  assert.match(engineSource, /PipeSpec SVG Engine\s+v1\.0/);
  assert.match(engineSource, /VALVE[\s\S]*FLANGE[\s\S]*PIPE[\s\S]*FITTING[\s\S]*GASKET/);
});

test('native wrappers stay below relaxed 300-line gate while vendor source is exempt', () => {
  assert.equal(manifest.maxNativeModuleLines, 300);
  for (const file of manifest.nativeFiles) {
    assert.ok(lineCount(file) <= manifest.maxNativeModuleLines, `${file} exceeds native line limit`);
  }
  assert.ok(lineCount(enginePath) > manifest.maxNativeModuleLines, 'vendor engine should remain source-sized');
});

test('PipeSpecSVG UMD API renders supported component SVGs', () => {
  const engine = loadEngine();
  assert.equal(typeof engine.buildSVGString, 'function');
  assert.equal(typeof engine.mount, 'function');
  const samples = manifest.sampleRows;
  for (const row of samples) {
    const svg = engine.buildSVGString(row, { width: 390, height: 262 });
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
    assert.doesNotMatch(svg, /<script|onload=|onclick=|javascript:/i);
  }
});

test('adapter maps normalized rows to PipeSpecSVG schema without wrong fallbacks', () => {
  const rows = [
    { componentType: 'PIPE', nps: '4', dn: 100, schedule: 'Sch 40', odMm: 114.3, wallMm: 6.02, idMm: 102.26, weightKgPerM: 16.08 },
    { componentType: 'FITTING', subtype: 'ELBOW_45', nps: '4', dn: 100, schedule: '40', odMm: 114.3, ctrToEndMm: 102, devLenMm: 120, weightKg: 2.1 },
    { componentType: 'FLANGE', subtype: 'BLIND', nps: '4', dn: 100, classRating: 'CL150', flangeOdMm: 230, flangeThicknessMm: 22.3, rfDiaMm: 157.2, rfHeightMm: 2, pcdMm: 190.5, boltCount: 8, isoBoltSizeMm: 16, blindThicknessMm: 22.3 },
    { componentType: 'VALVE', valveType: 'GATE', endType: 'FLANGED', nps: '4', dn: 100, classRating: '150', facing: 'RF', faceToFaceRfMm: 229, heightMm: 590, handwheelDiaMm: 250, rfRtjKg: 52 },
    { componentType: 'GASKET', subtype: 'RTJ', nps: '4', classRating: '150', outerDiaMm: 157, innerDiaMm: 115, thicknessMm: 4.5 },
  ];
  for (const row of rows) {
    assert.equal(hasPipeSpecSvgSupport(row), true);
    assert.notEqual(toPipeSpecSvgRow(row).componentType, 'UNKNOWN');
  }
  assert.equal(toPipeSpecSvgRow(rows[1]).subtype, 'ELBOW_45');
  assert.equal(hasPipeSpecSvgSupport({ componentType: 'SUPPORT', supportKind: 'GUIDE' }), false);
});

test('CI workflows preserve Agent 18 cumulative gate', () => {
  const ci = fs.readFileSync('.github/workflows/pipetools-ci.yml', 'utf8');
  const pages = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(ci, /pipetools-agent-18-svg-engine\.gate\.test\.js/);
  assert.match(pages, /pipetools-agent-18-svg-engine\.gate\.test\.js/);
  assert.match(pages, /_site\/pipetools\/vendor\/pipespec-svg\/svg-engine\.js/);
});
