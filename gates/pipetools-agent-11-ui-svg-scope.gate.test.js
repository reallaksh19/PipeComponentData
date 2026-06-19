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

test('disabled future modules and scoped inspector patch are wired', () => {
  assert.ok(text('pipetools/js/data.js').includes('DISABLED_MODULES'));
  assert.ok(text('pipetools/js/uiScopePatch.js').includes('PipeSpec DB'));
  assert.ok(text('pipetools/index.html').includes('uiScopePatch.js'));
});

test('audit SVG renderer file is connected to registry', () => {
  const registry = text('pipetools/js/svg/registry.js');
  assert.ok(registry.includes('auditGeneral.js'));
  assert.ok(registry.includes('FITTING_CAP'));
});
