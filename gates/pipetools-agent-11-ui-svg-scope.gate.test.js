import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function text(path) {
  return fs.readFileSync(path, 'utf8');
}

test('Agent 11 files stay compact', () => {
  const files = ['pipetools/js/data.js', 'pipetools/js/uiScopePatch.js', 'pipetools/js/svg/auditGeneral.js'];
  for (const file of files) assert.ok(text(file).split('\n').length <= 200, file);
});

test('disabled future modules render stable without polling patch', () => {
  const render = text('pipetools/js/render.js');
  const scope = text('pipetools/js/uiScopePatch.js');
  const app = text('pipetools/js/app.js');
  assert.ok(text('pipetools/js/data.js').includes('DISABLED_MODULES'));
  assert.ok(render.includes('DISABLED_MODULES'));
  assert.ok(render.includes('button:not(:disabled)'));
  assert.ok(render.includes('aria-disabled="true"'));
  assert.ok(render.includes('disabledModules.has(name)'));
  assert.ok(app.includes('disabledModules.has(name)'));
  assert.ok(app.includes('updateUiScope();'));
  assert.ok(scope.includes('PipeSpec DB'));
  assert.ok(!scope.includes('setInterval'));
  assert.ok(text('pipetools/index.html').includes('uiScopePatch.js'));
});

test('audit SVG renderer file is connected to registry', () => {
  const registry = text('pipetools/js/svg/registry.js');
  assert.ok(registry.includes('auditGeneral.js'));
  assert.ok(registry.includes('FITTING_CAP'));
});
