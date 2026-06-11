import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { fromCsv, toSemanticDxf, fromSemanticDxf } from '../src/index.js';

function graph() {
  return fromCsv(fs.readFileSync('fixtures/golden/phase03-seven-row.csv', 'utf8'));
}

test('Phase 11: graph to DXF sidecar round-trips losslessly', () => {
  const source = graph();
  const exported = toSemanticDxf(source);
  const restored = fromSemanticDxf(exported);
  assert.deepEqual(restored, source);
});

test('Phase 11: DXF-only import downgrades with counted diagnostics', () => {
  const exported = toSemanticDxf(graph());
  const restored = fromSemanticDxf(exported.dxf);
  assert.equal(restored.components.length, 7);
  assert.equal(restored.diagnostics.length, 1);
  assert.equal(restored.diagnostics[0].code, 'DXF_ONLY_IMPORT_DOWNGRADED');
  assert.ok(restored.components.every((component) => component.confidence === 'DOWNGRADED_DXF_ONLY'));
});

test('Phase 11: DXF fixture emits expected entity counts', () => {
  const exported = toSemanticDxf(graph());
  assert.equal((exported.dxf.match(/\nLINE\n/g) || []).length, 5);
  assert.equal((exported.dxf.match(/\nPOINT\n/g) || []).length, 2);
  assert.equal(exported.sidecar.componentCount, 7);
});
