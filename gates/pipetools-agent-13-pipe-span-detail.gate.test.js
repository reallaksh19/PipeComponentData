import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calculatePipeSpan, calculatePipeSpanDetailRows } from '../pipetools/js/pipeSpan/calculate.js';

const read = (path) => readFileSync(path, 'utf8');
const lines = (path) => read(path).split('\n').length;
const close = (actual, expected, tol = 0.08) => assert.ok(Math.abs(actual - expected) <= tol, `${actual} != ${expected}`);
const MAX_NATIVE_MODULE_LINES = 300;

test('Agent 13 keeps Pipe Span detail modules below relaxed 300-line gate', () => {
  assert.ok(lines('pipetools/js/pipeSpan/ui.js') < MAX_NATIVE_MODULE_LINES, 'ui module must stay under 300 lines');
  assert.ok(lines('pipetools/js/pipeSpan/calculate.js') < MAX_NATIVE_MODULE_LINES, 'calculate module must stay under 300 lines');
  assert.ok(lines('pipetools/js/pipeSpan/detailedTable.js') < MAX_NATIVE_MODULE_LINES, 'detail table module must stay under 300 lines');
});

test('Pipe Span exposes user requested constant inputs and detailed icon', () => {
  const ui = read('pipetools/js/pipeSpan/ui.js');
  const catalog = read('pipetools/js/pipeSpan/catalog.js');
  assert.match(ui, /Detailed View/);
  ['insulationDensityKgM3', 'waterDensityKgM3', 'youngsModulusNmm2', 'allowableDeflectionMm',
    'allowableStressNmm2', 'bearingLengthMm', 'bearingBaseMmFor42In', 'allowableIndentationStressNmm2']
    .forEach((key) => assert.match(ui + catalog, new RegExp(key)));
});

test('Pipe Span applies input constants to calculations', () => {
  const base = calculatePipeSpan({ nps: 2, schedule: 'Sch 40' });
  const softer = calculatePipeSpan({ nps: 2, schedule: 'Sch 40', youngsModulusNmm2: 105000 });
  assert.ok(softer.continuousDeflectionM < base.continuousDeflectionM, 'lower E must reduce deflection span');
  const higherS = calculatePipeSpan({ nps: 2, schedule: 'Sch 40', allowableStressNmm2: 80 });
  assert.ok(higherS.continuousStressM > base.continuousStressM, 'higher allowable stress must increase stress span');
});

test('Detailed view matches the supplied workbook-style Sch 40 sample columns', () => {
  const rows = calculatePipeSpanDetailRows({ nps: 2, schedule: 'Sch 40', service: 'VAPOUR', insulation: 'BARE', material: 'CS' });
  const nps2 = rows.find((row) => Number(row.pipeSize) === 2);
  assert.ok(nps2, 'NPS 2 detail row missing');
  close(nps2.pipeWeightNPerM, 53.36); close(nps2.insulationWeightNPerM, 25.49); close(nps2.waterWeightNPerM, 21.23);
  close(nps2.bearingWidthMm, 0.93); close(nps2.momentOfInertiaCm4, 27.7); close(nps2.indentationSpanM, 276.9, 0.2);
  close(nps2.simplyDeflectionM, 5.4); close(nps2.simplyStressM, 7.4);
  close(nps2.bsContinuousDeflectionM, 8.0); close(nps2.bsContinuousStressM, 9.1);
  close(nps2.civilContinuousDeflectionM, 6.8); close(nps2.civilContinuousStressM, 7.4);
  close(nps2.civilFixedDeflectionM, 8.0); close(nps2.civilFixedStressM, 9.1);
  close(nps2.kellogDeflectionM, 5.8); close(nps2.lcPengDeflectionM, 6.1);
  assert.equal(nps2.feedSpanM, 6.5); assert.equal(nps2.qmsSpanM, 5.25); assert.equal(nps2.qmsRackSpanM, 7.9);
  assert.equal(nps2.qmsVsLeastPct, 98); assert.equal(nps2.feedVsLeastPct, 121); assert.equal(nps2.feedVsBsContBeamPct, 81);
});

test('Detailed view displays reference labels instead of QMS labels', () => {
  const table = read('pipetools/js/pipeSpan/detailedTable.js');
  const ui = read('pipetools/js/pipeSpan/ui.js');
  assert.match(table, /Ref\.<br>Span/);
  assert.match(table, /Ref\.<br>Rack Span/);
  assert.match(table, /Ref\. Vs<br>Least/);
  assert.match(ui, /Ref\. span/);
  assert.doesNotMatch(table + ui, /QMS<br>|QMS reference/);
});

test('Detailed view is linked, styled, and published by workflows', () => {
  assert.match(read('pipetools/index.html'), /pipeSpanDetail\.css/);
  assert.match(read('pipetools/pipeSpanDetail.css'), /pipe-span-detail-table/);
  assert.match(read('.github/workflows/pipetools-ci.yml'), /pipetools-agent-13-pipe-span-detail/);
  assert.match(read('.github/workflows/pages.yml'), /pipeSpanDetail\.css/);
});
