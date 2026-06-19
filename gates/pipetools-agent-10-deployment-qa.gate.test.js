import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const cumulativeGates = [
  'pipetools-agent-00-03.gate.test.js',
  'pipetools-agent-04-search.gate.test.js',
  'pipetools-agent-05-svg.gate.test.js',
  'pipetools-agent-06-dashboard.gate.test.js',
  'pipetools-agent-07-pipe-span.gate.test.js',
  'pipetools-agent-08-spl2-bundle.gate.test.js',
  'pipetools-agent-09-data-loading.gate.test.js',
  'pipetools-agent-10-deployment-qa.gate.test.js',
];

test('Wave 7 gate modules stay below the approved line limit', () => {
  const files = [
    'gates/pipetools-agent-10-deployment-qa.gate.test.js',
  ];
  for (const file of files) {
    const lines = read(file).split('\n').length;
    assert.ok(lines <= 200, `${file} has ${lines} lines`);
  }
});

test('PipeTools CI and Pages workflows run every cumulative gate', () => {
  const ci = read('.github/workflows/pipetools-ci.yml');
  const pages = read('.github/workflows/pages.yml');
  for (const gate of cumulativeGates) {
    assert.match(ci, new RegExp(gate.replaceAll('.', '\\.')));
    assert.match(pages, new RegExp(gate.replaceAll('.', '\\.')));
  }
});

test('Pages artifact contract publishes PipeTools, SPL2, and public data only', () => {
  const pages = read('.github/workflows/pages.yml');
  const required = [
    '_site/pipetools/index.html',
    '_site/pipetools/js/app.js',
    '_site/pipetools/js/search/search.js',
    '_site/pipetools/js/svg/inspector.js',
    '_site/pipetools/js/pipeSpan/calculate.js',
    '_site/spl2-bundle/spl2_master.html',
    '_site/spl2-bundle/js/spl2/spl2_master.js',
    '_site/data/indexes/component-search.index.json',
    '_site/data/search/component-aliases.json',
    '_site/data/normalized/valves.json',
    '_site/data/audit/pipetools-agent-10-deployment-qa-manifest.json',
  ];
  for (const item of required) assert.match(pages, new RegExp(item.replaceAll('.', '\\.')));
  assert.match(pages, /url=.\.\/pipetools\//);
  assert.match(pages, /Raw source database tree must not be published/);
});

test('PipeTools route smoke contract exposes all merged product tabs', () => {
  const data = read('pipetools/js/data.js');
  const render = read('pipetools/js/render.js');
  const html = read('pipetools/index.html');
  for (const tab of ['PipeSpec DB', 'Pipe Span', '2D Bundle Calc', 'Pipe Spacing', 'Section Designer']) {
    assert.match(data, new RegExp(tab));
  }
  assert.match(render, /state\.activeModule === 'Pipe Span'/);
  assert.match(render, /state\.activeModule === '2D Bundle Calc'/);
  assert.match(render, /src="\.\.\/spl2-bundle\/spl2_master\.html"/);
  assert.match(html, /<script type="module" src="\.\/js\/app\.js"><\/script>/);
});

test('Wave 7 audit manifest is present and versioned', () => {
  const manifestPath = 'data/audit/pipetools-agent-10-deployment-qa-manifest.json';
  const manifest = JSON.parse(read(manifestPath));
  assert.equal(manifest.wave, 7);
  assert.equal(manifest.agent, 'Agent 10');
  assert.equal(manifest.status, 'deployment-qa');
  assert.ok(Array.isArray(manifest.routes));
  assert.ok(statSync(manifestPath).size > 100);
});
