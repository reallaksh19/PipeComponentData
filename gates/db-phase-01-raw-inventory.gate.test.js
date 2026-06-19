import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const raw = (name) => new URL(`data/raw-manifest/${name}`, ROOT);
const readJson = (name) => JSON.parse(readFileSync(raw(name), 'utf8'));

const expectedCounts = {
  totalFiles: 1417,
  folders: 42,
  csvFiles: 914,
  dxfFiles: 240,
  setFiles: 227,
  otherFiles: 36,
};

const requiredFolderFamilies = {
  Vlfl: ['VALVE', 'FLANGED'],
  Flan: ['FLANGE', 'ASME_B16_5'],
  Ftbw: ['FITTING', 'BUTTWELD'],
  Wbol: ['OLET', 'BRANCH_OLET'],
  Grtj: ['GASKET', 'RTJ'],
  Piwt: ['PIPE_AUX', 'PIPE_WEIGHT'],
  Psiz: ['PIPE_AUX', 'PIPE_SIZE'],
  Pwal: ['PIPE_AUX', 'PIPE_WALL'],
  Span: ['PIPE_AUX', 'SAFE_SPAN'],
};

describe('DB Phase 1 raw source inventory', () => {
  it('pins the real Pipedata.zip inventory counts', () => {
    const report = readJson('extraction-report.json');
    assert.deepEqual(report.expectedCounts, expectedCounts);
    assert.deepEqual(report.parseStatusCounts, {
      APP_CONFIG: 240,
      RAW_TABLE: 914,
      SKETCH_ONLY: 240,
      UNSUPPORTED_SOURCE: 23,
    });
    assert.equal(report.sourceArchive.sha256.length, 64);
  });

  it('freezes every source folder classification', () => {
    const { folders } = readJson('folder-family-map.json');
    assert.equal(folders.length, expectedCounts.folders);
    const byFolder = Object.fromEntries(folders.map((row) => [row.folder, row]));
    for (const [folder, [family, subfamily]] of Object.entries(requiredFolderFamilies)) {
      assert.equal(byFolder[folder].family, family, `${folder} family drift`);
      assert.equal(byFolder[folder].subfamily, subfamily, `${folder} subfamily drift`);
    }
  });

  it('catalogs folder counts and source roles explicitly', () => {
    const catalog = readJson('folder-catalog.json').folders;
    assert.equal(catalog.length, expectedCounts.folders);
    assert.equal(sum(catalog, 'filesTotal'), expectedCounts.totalFiles);
    assert.equal(sum(catalog, 'csvFiles'), expectedCounts.csvFiles);
    assert.equal(sum(catalog, 'dxfFiles'), expectedCounts.dxfFiles);
    assert.equal(sum(catalog, 'setFiles'), expectedCounts.setFiles);
    assert.equal(catalog.find((row) => row.folder === 'Vlfl').csvFiles, 96);
    assert.equal(catalog.find((row) => row.folder === 'Ftbw').filesTotal, 359);
    assert.equal(catalog.find((row) => row.folder === 'Gensets').family, 'APP_CONFIG');
  });

  it('keeps representative file and table samples checksumed', () => {
    const files = readJson('source-files.sample.json').files;
    const tables = readJson('table-catalog.sample.json').tables;
    const checksums = readJson('source-checksums.sample.json').checksums;
    const byId = Object.fromEntries(files.map((file) => [file.sourceId, file]));
    assert.equal(tables.length, 4);
    for (const file of files) assert.equal(file.checksumSha256, checksums[file.sourceId]);

    assert.equal(byId['Database/Vlfl/VLV1150.csv'].family, 'VALVE');
    assert.equal(byId['Database/Vlfl/VLV1150.csv'].classRating, '150');
    assert.equal(byId['Database/Vlfl/VLV11500.csv'].classRating, '1500');
    assert.equal(byId['Database/Ftbw/ftbw15.pdp'].parseStatus, 'UNSUPPORTED_SOURCE');
    assert.equal(byId['Database/Gensets/SearchFile.csv'].parseStatus, 'RAW_TABLE');
  });
});

function sum(rows, key) {
  return rows.reduce((total, row) => total + row[key], 0);
}
