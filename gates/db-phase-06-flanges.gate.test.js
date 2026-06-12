import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  buildFlangeIndex,
  explodeFlangeRows,
  lookupFlangeCatalogRecord,
  parseFlangeCsv,
  validateFlangeRows,
} from '../src/db/flangeCatalog.js';

const ROOT = process.cwd();
const FLAN_DIR = path.join(ROOT, 'docs/Pipedata/Database/Flan');
const METRIC_FILES = ['Flg150.csv', 'Flg300.csv', 'Flg400.csv', 'Flg600.csv', 'Flg900.csv', 'Flg1500.csv', 'Flg2500.csv'];
const SOURCE_SKIP = 'full docs/Pipedata/Database/Flan CSV source files are not committed in this checkout';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function sourceFilesAvailable() {
  return METRIC_FILES.every((file) => fs.existsSync(path.join(FLAN_DIR, file)));
}

function parsedMetricSources() {
  return METRIC_FILES.map((file) => parseFlangeCsv(fs.readFileSync(path.join(FLAN_DIR, file), 'utf8'), `docs/Pipedata/Database/Flan/${file}`));
}

const sourceGateOptions = sourceFilesAvailable() ? {} : { skip: SOURCE_SKIP };

test('DB Phase 6: metric Flan source files are present and explode deterministically', sourceGateOptions, () => {
  const parsed = parsedMetricSources();
  assert.equal(parsed.length, 7);
  assert.equal(parsed.reduce((sum, item) => sum + item.rows.length, 0), 161);
  assert.ok(parsed.every((item) => item.columnCount === 54));
  const exploded = parsed.flatMap(explodeFlangeRows);
  assert.equal(exploded.length, 483);
  assert.deepEqual([...new Set(exploded.map((row) => row.subtype))].sort(), ['BLIND', 'SO', 'WN']);
  assert.deepEqual(validateFlangeRows(exploded), []);
});

test('DB Phase 6: 4 inch Class 300 WN flange values match source exactly', sourceGateOptions, () => {
  const rows = parsedMetricSources().flatMap(explodeFlangeRows);
  const row = rows.find((item) => item.id === 'FLANGE|WN|NPS4|CL300|METRIC');
  assert.equal(row.flangeOdMm, 255);
  assert.equal(row.flangeThicknessMm, 30.2);
  assert.equal(row.hubXMm, 146);
  assert.equal(row.weldDiaMm, 114.3);
  assert.equal(row.wnLengthMm, 84);
  assert.equal(row.rfDiaMm, 157.2);
  assert.equal(row.rtjRfDiaMm, 175);
  assert.equal(row.ringNo, '37');
  assert.equal(row.pcdMm, 200);
  assert.equal(row.boltCount, 8);
  assert.equal(row.isoBoltSizeMm, 20);
  assert.equal(row.weightKg, 11.4);
  assert.equal('boreMm' in row, false);
});

test('DB Phase 6: one Flan row explodes into WN, SO, and BLIND without losing subtype weights', sourceGateOptions, () => {
  const rows = parsedMetricSources().flatMap(explodeFlangeRows);
  assert.equal(rows.find((row) => row.id === 'FLANGE|SO|NPS4|CL300|METRIC').weightKg, 10);
  assert.equal(rows.find((row) => row.id === 'FLANGE|SO|NPS4|CL300|METRIC').soBoreMm, 116.8);
  assert.equal(rows.find((row) => row.id === 'FLANGE|BLIND|NPS4|CL300|METRIC').weightKg, 12.3);
  assert.equal(rows.find((row) => row.id === 'FLANGE|BLIND|NPS4|CL300|METRIC').blindThicknessMm, 30.2);
});

test('DB Phase 6: committed sample catalog is indexed and source-rooted to docs/Pipedata', () => {
  const dataset = readJson('data/normalized/flanges.json');
  assert.equal(dataset.summary.sourceRoot, 'docs/Pipedata/Database/Flan');
  assert.equal(dataset.summary.metricSourceRowCount, 161);
  assert.equal(dataset.summary.explodedRowCount, 483);
  assert.equal(dataset.summary.generationMode, 'SOURCE_BACKED_SAMPLE_EXPANSION');
  assert.equal(dataset.summary.sampledRowCount, 9);
  assert.deepEqual(validateFlangeRows(dataset.rows), []);
  const index = buildFlangeIndex(dataset.rows);
  assert.deepEqual(index.byKey, readJson('data/indexes/flange.index.json').byKey);
  const hit = lookupFlangeCatalogRecord({ ...dataset, index }, { subtype: 'WN', nps: '4', classRating: '300' });
  assert.equal(hit.ok, true);
  assert.equal(hit.row.source, 'docs/Pipedata/Database/Flan/Flg300.csv');
});

test('DB Phase 6: flange catalog modules and gate stay under accepted 300-line limit', () => {
  for (const relativePath of ['src/db/flangeCatalog.js', 'gates/db-phase-06-flanges.gate.test.js']) {
    const lineCount = fs.readFileSync(path.join(ROOT, relativePath), 'utf8').split('\n').length;
    assert.ok(lineCount <= 300, `${relativePath} has ${lineCount} lines`);
  }
});
