import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const SPL2_ROOT = 'spl2-bundle';
const SPL2_JS_ROOT = join(SPL2_ROOT, 'js', 'spl2');

function attrValues(html, attr) {
  return [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, 'g'))].map((match) => match[1]);
}

function assertLocalAsset(path) {
  assert.equal(path.startsWith('http'), false, `${path} must stay local/static`);
  assert.equal(path.startsWith('/'), false, `${path} must be relative for GitHub Pages`);
  assert.equal(path.includes('..'), false, `${path} must not climb out of SPL2 bundle`);
  assert.ok(existsSync(join(SPL2_ROOT, path)), `${path} target missing`);
}

test('Wave 12: PipeTools iframe route resolves to copied SPL2 bundle', () => {
  const config = read('pipetools/js/bundle/bundleConfig.js');
  const view = read('pipetools/js/bundle/bundleView.js');
  assert.ok(config.includes("src: '../spl2-bundle/spl2_master.html'"));
  assert.ok(config.includes("upstreamRepo: 'reallaksh19/Simplified_Analysis'"));
  assert.ok(view.includes('class="bundle-frame"'));
  assert.ok(view.includes('No PipeSpec or Pipe Span state is shared'));
});

test('Wave 12: SPL2 iframe is source UI, not a blank or compact shell', () => {
  const html = read('spl2-bundle/spl2_master.html');
  assert.ok(html.split('\n').length > 500, 'source SPL2 HTML should stay vendored/full');
  for (const token of [
    '<link rel="stylesheet" href="css/app.css">',
    'id="top-tab-spl2"',
    'class="sidebar-nav"',
    'Loop Calculations',
    'Pipe Rack Calculation',
    'Simplified Method',
    'Database',
    '2D Bundle Config',
    'Diagnostics',
    'GLOBAL CONSTANTS & CONFIGURATION',
    'ROUTING DEFINITION MATRIX',
    'MASTER DATABASE PANE',
    '<script type="module" src="js/spl2/spl2_master.js"></script>',
  ]) assert.ok(html.includes(token), `${token} missing`);
  for (const stale of ['placeholder reserves', 'SPL2 compact loop screening', 'data-pipetools-legacy="spl2"']) {
    assert.equal(html.includes(stale), false, `${stale} must not return`);
  }
});

test('Wave 12: every SPL2 stylesheet/script reference resolves inside the copied bundle', () => {
  const html = read('spl2-bundle/spl2_master.html');
  for (const href of attrValues(html, 'href').filter((value) => value.endsWith('.css'))) {
    assertLocalAsset(href);
  }
  for (const src of attrValues(html, 'src').filter((value) => value.endsWith('.js'))) {
    assertLocalAsset(src);
  }
});

test('Wave 12: SPL2 master import graph resolves without app-relative path leaks', () => {
  const js = read('spl2-bundle/js/spl2/spl2_master.js');
  const imports = [...js.matchAll(/from\s+['"](\.\/[A-Za-z0-9_-]+\.js)['"]/g)].map((match) => match[1]);
  assert.deepEqual(imports.sort(), [
    './spl2_database.js',
    './spl2_loop_algo.js',
    './spl2_loop_canvas.js',
    './spl2_rack_canvas.js',
    './spl2_simp_canvas.js',
  ].sort());
  for (const rel of imports) {
    const resolved = normalize(join(SPL2_JS_ROOT, rel));
    assert.ok(resolved.startsWith(SPL2_JS_ROOT), `${rel} escapes SPL2 JS root`);
    assert.ok(existsSync(resolved), `${rel} import target missing`);
  }
  assert.equal(js.includes('../pipetools'), false);
  assert.equal(js.includes('http://'), false);
  assert.equal(js.includes('https://'), false);
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
    'table-simp-matrix',
    'debug_out',
  ]) assert.ok(html.includes(`id="${id}"`), `${id} missing`);
});

test('Wave 12: Pages workflow publishes and cache-busts the SPL2 iframe assets', () => {
  const pages = read('.github/workflows/pages.yml');
  const ci = read('.github/workflows/pipetools-ci.yml');
  assert.ok(pages.includes('cp -R spl2-bundle/. _site/spl2-bundle/'));
  assert.ok(pages.includes('s|css/app.css|css/app.css?v=${BUILD_SHA}|g'));
  assert.ok(pages.includes('s|js/spl2/spl2_master.js|js/spl2/spl2_master.js?v=${BUILD_SHA}|g'));
  assert.ok(pages.includes('node --test gates/pipetools-agent-15-spl2-integration.gate.test.js'));
  assert.ok(ci.includes('node --test gates/pipetools-agent-15-spl2-integration.gate.test.js'));
});
