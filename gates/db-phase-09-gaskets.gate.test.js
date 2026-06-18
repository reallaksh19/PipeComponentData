import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildGasketIndex, gasketSourceFolders, lookupGasketRecord, validateGasketRows } from '../src/db/gasketCatalog.js';

const catalog = JSON.parse(fs.readFileSync('data/normalized/gaskets.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('data/indexes/gasket.index.json', 'utf8'));
const folderCatalog = JSON.parse(fs.readFileSync('data/raw-manifest/folder-catalog.json', 'utf8'));

test('DB Phase 9: gasket source inventory is pinned before dimensions are promoted', () => {
  const folders = gasketSourceFolders(folderCatalog);
  assert.deepEqual(folders.map((folder) => folder.folder).sort(), ['Gflt', 'Gpas', 'Grtj', 'Gspr']);
  const keyed = Object.fromEntries(folders.map((folder) => [folder.folder, folder]));
  assert.equal(keyed.Gflt.csvFiles, 6);
  assert.equal(keyed.Grtj.csvFiles, 6);
  assert.equal(keyed.Gspr.csvFiles, 6);
  assert.equal(keyed.Gpas.csvFiles, 0);
  assert.equal(keyed.Grtj.parseStatusCounts.UNSUPPORTED_SOURCE, 6);
});

test('DB Phase 9: committed gasket rows are provenance-complete and non-fabricated', () => {
  assert.equal(catalog.metadata.generationMode, 'SOURCE_INVENTORY_SELECTOR_ROWS_ONLY');
  assert.equal(catalog.rows.length, 3);
  assert.deepEqual(validateGasketRows(catalog.rows), []);
  for (const row of catalog.rows) {
    assert.equal(row.componentType, 'GASKET');
    assert.equal(row.dataStatus, 'MISSING_DIMENSION');
    assert.ok(row.source.startsWith('docs/Pipedata/Database/'));
    for (const dimension of Object.values(row.dimensions)) {
      assert.equal(dimension.value, null);
      assert.equal(dimension.basis, 'UNAVAILABLE');
    }
  }
});

test('DB Phase 9: gasket index matches committed rows and misses are safe', () => {
  const built = buildGasketIndex(catalog.rows);
  assert.deepEqual(built.diagnostics, []);
  assert.deepEqual(built.index, index.index);
  const rtj = lookupGasketRecord({ rows: catalog.rows, index: index.index }, {
    subtype: 'RTJ',
    nps: null,
    classRating: null,
    facing: 'RTJ',
  });
  assert.equal(rtj.ok, true);
  assert.equal(rtj.row.id, 'GASKET|RTJ|UNKNOWN|UNKNOWN|RTJ');
  const miss = lookupGasketRecord({ rows: catalog.rows, index: index.index }, { subtype: 'UNKNOWN' });
  assert.equal(miss.ok, false);
  assert.equal(miss.code, 'GASKET_LOOKUP_MISS');
});

test('DB Phase 9: gasket catalog modules and gate stay under 200 lines', () => {
  for (const file of ['src/db/gasketCatalog.js', 'gates/db-phase-09-gaskets.gate.test.js']) {
    const lineCount = fs.readFileSync(file, 'utf8').split('\n').length;
    assert.ok(lineCount <= 200, `${file} has ${lineCount} lines`);
  }
});
