import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { renderPipeSpecInspector } from '../pipetools/js/pipespecInspector.js';
import { hasPipeSpecSvgSupport, toPipeSpecSvgRow } from '../pipetools/js/svg/pipeSpecSvgAdapter.js';

const manifest = JSON.parse(fs.readFileSync('data/audit/pipetools-agent-19-svg-detail-routing-manifest.json', 'utf8'));
const renderSource = fs.readFileSync('pipetools/js/render.js', 'utf8');
const inspectorSource = fs.readFileSync('pipetools/js/pipespecInspector.js', 'utf8');
const adapterSource = fs.readFileSync('pipetools/js/svg/pipeSpecSvgAdapter.js', 'utf8');

function lineCount(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

function allowedLines(file) {
  return file === 'pipetools/js/render.js' ? 260 : manifest.maxNativeModuleLines;
}

const nestedElbow45 = {
  id: 'FITTING|ELBOW_45|NPS4|SCH40|METRIC',
  componentType: 'FITTING',
  subtype: 'ELBOW_45',
  nps: '4',
  dn: 100,
  schedule: '40',
  standard: 'ASME B16.9',
  dimensions: {
    odMm: { value: 114.3, unit: 'mm' },
    centerToEndMm: { value: 64, unit: 'mm' },
    developedLengthMm: { value: 119.07127, unit: 'mm' },
  },
  weights: { weightKg: { value: 1.95, unit: 'kg' } },
};

test('Agent 19 manifest and native files are present', () => {
  assert.equal(manifest.schema, 'pipetools-agent-19-svg-detail-routing/v1');
  for (const file of manifest.nativeFiles) assert.ok(fs.existsSync(file), `${file} missing`);
  for (const file of manifest.vendorFiles) assert.ok(fs.existsSync(file), `${file} missing`);
});

test('nested normalized rows map to PipeSpecSVG schema', () => {
  const svgRow = toPipeSpecSvgRow(nestedElbow45);
  assert.equal(hasPipeSpecSvgSupport(nestedElbow45), true);
  assert.equal(svgRow.componentType, 'FITTING');
  assert.equal(svgRow.subtype, 'ELBOW_45');
  assert.equal(svgRow.odMm, 114.3);
  assert.equal(svgRow.ctrToEndMm, 64);
  assert.equal(svgRow.devLenMm, 119.07127);
  assert.equal(svgRow.weightKg, 1.95);
});

test('supported detail panel uses source SVG host instead of legacy registry fallback', () => {
  const html = renderPipeSpecInspector(nestedElbow45);
  assert.match(html, /data-pipespec-svg-host="true"/);
  assert.match(html, /svg-loading/);
  assert.match(html, /FITTING \/ ELBOW_45/);
  assert.doesNotMatch(inspectorSource, /resolveInspectorSvg|renderSvgPreview/);
  assert.match(renderSource, /mountPipeSpecSvg/);
  assert.match(renderSource, /mountInspectorSvg/);
});

test('unsupported detail panel is explicit and does not fallback to wrong SVG', () => {
  const html = renderPipeSpecInspector({ id: 'SUPPORT|GUIDE|1', componentType: 'SUPPORT', supportKind: 'GUIDE' });
  assert.match(html, /SVG not available/);
  assert.doesNotMatch(html, /data-pipespec-svg-host/);
  assert.equal(hasPipeSpecSvgSupport({ componentType: 'SUPPORT', supportKind: 'GUIDE' }), false);
});

test('adapter explicitly preserves 45-degree elbow routing', () => {
  assert.match(adapterSource, /ELBOW_45/);
  assert.notEqual(toPipeSpecSvgRow(nestedElbow45).subtype, 'ELBOW_90');
});

test('Agent 19 native routing modules remain compact and legacy renderer stays guarded', () => {
  for (const file of manifest.nativeFiles) {
    const lines = lineCount(file);
    assert.ok(lines <= allowedLines(file), `${file} exceeds line limit: ${lines}`);
  }
});

test('CI workflows preserve Agent 19 cumulative gate', () => {
  const ci = fs.readFileSync('.github/workflows/pipetools-ci.yml', 'utf8');
  const pages = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(ci, /pipetools-agent-19-svg-detail-routing\.gate\.test\.js/);
  assert.match(pages, /pipetools-agent-19-svg-detail-routing\.gate\.test\.js/);
  assert.match(pages, /pipetools-agent-19-svg-detail-routing-manifest\.json/);
});
