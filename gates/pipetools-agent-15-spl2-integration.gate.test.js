import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const SPL2_ROOT = 'spl2-bundle';
const SPL2_JS_ROOT = join(SPL2_ROOT, 'js', 'spl2');

function hasId(html, id) {
  return new RegExp(`id=["']${id}["']`).test(html);
}

test('Wave 12: PipeTools iframe route resolves to copied SPL2 bundle', () => {
  const config = read('pipetools/js/bundle/bundleConfig.js');
  const view = read('pipetools/js/bundle/bundleView.js');
  assert.ok(config.includes("src: '../spl2-bundle/spl2_master.html'"));
  assert.ok(config.includes("upstreamRepo: 'reallaksh19/Simplified_Analysis'"));
  assert.ok(view.includes('class="bundle-frame"'));
  assert.ok(view.includes('No PipeSpec or Pipe Span state is shared'));
});

test('Wave 12: SPL2 iframe is copied source UI, not compact placeholder shell', () => {
  const html = read('spl2-bundle/spl2_master.html');
  assert.ok(html.split('\n').length > 500, 'source SPL2 HTML should stay vendored/full');
  for (const token of [
    'css/app.css',
    'sidebar-nav',
    'Loop Calculations',
    'Pipe Rack Calculation',
    'Simplified Method',
    'Database',
    '2D Bundle Config',
    'Diagnostics',
    'js/spl2/spl2_master.js',
  ]) assert.ok(html.includes(token), `${token} missing`);
  assert.ok(hasId(html, 'top-tab-spl2'), 'top-tab-spl2 missing');
  assert.equal(html.includes('SPL2 compact loop screening'), false);
  assert.equal(html.includes('data-pipetools-legacy="spl2"'), false);
});

test('Wave 12: declared SPL2 assets and import graph exist in copied bundle', () => {
  assert.ok(existsSync(join(SPL2_ROOT, 'spl2_master.html')));
  assert.ok(existsSync(join(SPL2_ROOT, 'css', 'app.css')));
  assert.ok(existsSync(join(SPL2_JS_ROOT, 'spl2_master.js')));

  const js = read('spl2-bundle/js/spl2/spl2_master.js');
  const imports = [...js.matchAll(/from\s+['"](\.\/[A-Za-z0-9_-]+\.js)['"]/g)].map((match) => match[1]);
  for (const expected of [
    './spl2_database.js',
    './spl2_loop_algo.js',
    './spl2_loop_canvas.js',
    './spl2_rack_canvas.js',
    './spl2_simp_canvas.js',
  ]) assert.ok(imports.includes(expected), `${expected} import missing`);
  for (const rel of imports) {
    const resolved = normalize(join(SPL2_JS_ROOT, rel));
    assert.ok(resolved.startsWith(SPL2_JS_ROOT), `${rel} escapes SPL2 JS root`);
    assert.ok(existsSync(resolved), `${rel} import target missing`);
  }
});

test('Wave 12: source controls and canvases required for browser smoke remain present', () => {
  const html = read('spl2-bundle/spl2_master.html');
  for (const id of [
    'canvas-loop',
    'canvas-rack-section',
    'canvas-rack-plan',
    'canvas-simp-3d',
    'global_inp_units',
    'global_inp_ins_dens',
    'loop_btn_run',
    'rack_btn_run',
    'simp_btn_run',
    'table-rack',
    'debug_out',
  ]) assert.ok(hasId(html, id), `${id} missing`);
});

test('Wave 12: Pages workflow publishes the SPL2 iframe assets and runs smoke gate', () => {
  const pages = read('.github/workflows/pages.yml');
  const ci = read('.github/workflows/pipetools-ci.yml');
  assert.ok(pages.includes('cp -R spl2-bundle/. _site/spl2-bundle/'));
  assert.ok(pages.includes('css/app.css?v=${BUILD_SHA}'));
  assert.ok(pages.includes('js/spl2/spl2_master.js?v=${BUILD_SHA}'));
  assert.ok(pages.includes('node --test gates/pipetools-agent-15-spl2-integration.gate.test.js'));
  assert.ok(ci.includes('node --test gates/pipetools-agent-15-spl2-integration.gate.test.js'));
});
