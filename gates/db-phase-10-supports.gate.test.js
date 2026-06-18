import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { lookupSupportRecord, validateSupportRows } from '../src/db/supportCatalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/normalized/supports.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/indexes/support.index.json'), 'utf8'));
const folders = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/raw-manifest/folder-catalog.json'), 'utf8')).folders;

function folder(name) {
  return folders.find((item) => item.folder === name);
}

test('DB Phase 10: span and pipe-spacing source availability is pinned', () => {
  assert.deepEqual(catalog.sourceRoots, ['docs/Pipedata/Database/Span', 'docs/Pipedata/Database/Gpas']);
  assert.equal(folder('Span').family, 'PIPE_AUX');
  assert.equal(folder('Span').subfamily, 'SAFE_SPAN');
  assert.equal(folder('Span').csvFiles, 0);
  assert.equal(folder('Span').dxfFiles, 2);
  assert.equal(folder('Span').setFiles, 3);
  assert.equal(folder('Gpas').subfamily, 'PIPE_SPACING');
  assert.equal(folder('Gpas').csvFiles, 0);
  assert.equal(folder('Gpas').dxfFiles, 4);
});

test('DB Phase 10: support defaults are provenance-complete and do not create pipe continuity', () => {
  assert.equal(catalog.rows.length, 2);
  assert.equal(validateSupportRows(catalog.rows), true);
  for (const row of catalog.rows) {
    assert.equal(row.componentFamily, 'SUPPORT');
    assert.equal(row.createsPipeContinuity, false);
    assert.equal(row.attachmentRule, 'NEAREST_PIPE');
    assert.equal(row.provenance.dataStatus, 'PROJECT_OVERRIDE');
  }
});

test('DB Phase 10: committed support index matches rows and lookup misses are safe', () => {
  const runtimeIndex = Object.fromEntries(catalog.rows.map((row) => [`SUPPORT|${row.supportKind}`, row.id]));
  assert.deepEqual(index.byKey, runtimeIndex);
  const db = { rows: catalog.rows, index };
  assert.equal(lookupSupportRecord(db, { supportKind: 'SHOE' }).row.dimensionValues.shoeHeightMm.value, 150);
  assert.equal(lookupSupportRecord(db, { supportKind: 'GUIDE' }).row.dimensionValues.guideGapMm.value, 5);
  assert.deepEqual(lookupSupportRecord(db, { supportKind: 'ANCHOR' }), {
    ok: false,
    code: 'SUPPORT_LOOKUP_MISS',
    query: { supportKind: 'ANCHOR' },
  });
});

test('DB Phase 10: unavailable support dimensions remain null, never zero', () => {
  const shoe = catalog.rows.find((row) => row.supportKind === 'SHOE');
  const guide = catalog.rows.find((row) => row.supportKind === 'GUIDE');
  assert.equal(shoe.dimensionValues.guideGapMm.value, null);
  assert.equal(shoe.dimensionValues.guideGapMm.basis, 'UNAVAILABLE');
  assert.equal(guide.dimensionValues.shoeHeightMm.value, null);
  assert.equal(guide.dimensionValues.shoeHeightMm.basis, 'UNAVAILABLE');
});

test('DB Phase 10: support catalog modules and gate stay under 200 lines', () => {
  for (const rel of ['src/db/supportCatalog.js', 'gates/db-phase-10-supports.gate.test.js']) {
    const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').length;
    assert.ok(lines <= 200, `${rel} has ${lines} lines`);
  }
});
