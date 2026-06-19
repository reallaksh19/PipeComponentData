import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { calculatePipeSpan } from '../pipetools/js/pipeSpanCalc.js';

const manifest = JSON.parse(fs.readFileSync('data/audit/pipetools-agent-00-03-manifest.json', 'utf8'));
const sourceFiles = [
  'pipetools/index.html',
  'pipetools/pipetools.css',
  'pipetools/js/app.js',
  'pipetools/js/data.js',
  'pipetools/js/pipeSpanCalc.js',
  'pipetools/js/render.js',
  'pipetools/js/svg.js',
];
const vendorSourceFiles = manifest.vendorSourceLineLimitExemptions ?? [];

test('PipeTools Agent 00-03 manifest and routes are present', () => {
  assert.equal(manifest.schema, 'pipetools-agent-foundation/v1');
  assert.equal(manifest.maxNewModuleLines, 300);
  for (const moduleName of ['PipeSpec DB', 'Pipe Span', '2D Bundle Calc']) {
    assert.equal(manifest.modules.includes(moduleName), true, `${moduleName} missing`);
  }
});

test('PipeTools Agent 00-03 keeps native modules below 300 lines', () => {
  for (const file of sourceFiles) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= manifest.maxNewModuleLines, `${file} has ${lines} lines`);
  }
});

test('PipeTools Agent 00-03 records approved vendored source exemptions', () => {
  assert.ok(vendorSourceFiles.includes('spl2-bundle/spl2_master.html'));
  for (const file of vendorSourceFiles) {
    assert.ok(fs.existsSync(file), `${file} missing`);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    assert.ok(lines > manifest.maxNewModuleLines, `${file} should be a vendored source exemption`);
  }
});

test('PipeTools Pipe Span calculation follows Excel baseline samples', () => {
  const bareVapour = calculatePipeSpan({ nps: 8, service: 'VAPOUR', insulation: 'BARE', material: 'CS' });
  const insulWater = calculatePipeSpan({ nps: 8, service: 'WATER', insulation: 'INSULATED', material: 'CS' });
  assert.ok(Math.abs(bareVapour.simplyDeflectionM - 10.3915) < 0.08);
  assert.ok(Math.abs(bareVapour.totalWeightNPerM - 417.5079) < 0.3);
  assert.ok(Math.abs(insulWater.simplyDeflectionM - 8.5245) < 0.08);
  assert.ok(Math.abs(insulWater.totalWeightNPerM - 921.9473) < 0.3);
});

test('PipeTools Pages workflow publishes app and 2D bundle boundary', () => {
  const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /cp -R pipetools\/. _site\/pipetools\//);
  assert.match(workflow, /cp -R spl2-bundle\/. _site\/spl2-bundle\//);
  for (const expected of ['_site/pipetools/index.html', '_site/spl2-bundle/spl2_master.html']) {
    assert.equal(path.isAbsolute(expected), false);
  }
});
