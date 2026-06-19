import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  calculatePipeSpan, getPipeSpanRow, getPipeSpanSchedules, listPipeSpanRows, normalizePipeSpanInput,
} from '../pipetools/js/pipeSpan/calculate.js';
import { PIPE_SPAN_SOURCE, PIPE_SPAN_VALIDATION_CASES } from '../pipetools/js/pipeSpan/catalog.js';
import { renderPipeSpanMain } from '../pipetools/js/pipeSpan/ui.js';

const modules = [
  'pipetools/js/pipeSpan/catalog.js',
  'pipetools/js/pipeSpan/weights.js',
  'pipetools/js/pipeSpan/spans.js',
  'pipetools/js/pipeSpan/trace.js',
  'pipetools/js/pipeSpan/calculate.js',
  'pipetools/js/pipeSpan/ui.js',
  'pipetools/js/pipeSpanCalc.js',
  'pipetools/js/render.js',
];
const MAX_NATIVE_MODULE_LINES = 300;

function near(actual, expected, tolerance = 0.02) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} not within ${tolerance} of ${expected}`);
}

const trace = (result, id) => result.formulaTrace.find((step) => step.id === id);

const roundedTraceResult = (value) => Number(value.toFixed(6));

test('Agent 07 modules stay below relaxed 300-line gate', () => {
  for (const file of modules) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= MAX_NATIVE_MODULE_LINES, `${file} has ${lines} lines`);
  }
});

test('native pipe span catalog exposes Excel schedule data and source name', () => {
  assert.equal(PIPE_SPAN_SOURCE.workbook, 'Pipe Span Check-FINAL.xlsx');
  assert.ok(listPipeSpanRows().length >= 40);
  assert.ok(getPipeSpanSchedules(2).includes('Sch 40'));
  assert.ok(getPipeSpanSchedules(8).includes('Sch 40'));
});

test('calculation model matches uploaded Excel sample sheets', () => {
  for (const item of PIPE_SPAN_VALIDATION_CASES) {
    const result = calculatePipeSpan(item.input);
    for (const [key, expected] of Object.entries(item.expected)) near(result[key], expected);
  }
});

test('selected, least allowable, and governing spans are distinct concepts', () => {
  const result = calculatePipeSpan({ nps: 2, schedule: 'Sch 40', service: 'VAPOUR', insulation: 'BARE' });
  assert.ok(result.leastAllowableSpanM < result.selectedMethodSpanM);
  assert.equal(result.governingSpanM, result.selectedMethodSpanM);
  assert.equal(result.governingSpanM, Math.min(result.selectedMethodSpanM, result.indentationSpanM));
});

test('formula trace values match returned result fields', () => {
  const result = calculatePipeSpan({ nps: 2, schedule: 'Sch 40', service: 'WATER', insulation: 'INSULATED' });
  assert.equal(trace(result, 'selected-method').result, roundedTraceResult(result.selectedMethodSpanM));
  assert.equal(trace(result, 'least-allowable').result, roundedTraceResult(result.leastAllowableSpanM));
  assert.equal(trace(result, 'governing').result, roundedTraceResult(result.governingSpanM));
  assert.equal(trace(result, 'governing').formula, 'MIN(selectedMethodSpanM, indentationSpanM)');
});

test('NPS schedule is normalized and invalid row lookup is explicit', () => {
  const normalized = normalizePipeSpanInput({ nps: 12, schedule: 'Sch 40' });
  assert.equal(normalized.schedule, 'STD');
  assert.equal(calculatePipeSpan({ nps: 12, schedule: 'Sch 40' }).input.schedule, 'STD');
  assert.throws(() => getPipeSpanRow(12, 'Sch 40'), /Schedule Sch 40 not available/);
});

test('UI binding renders separated span outputs and formula trace', () => {
  const nodes = new Map();
  globalThis.document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, { textContent: '', innerHTML: '' }); return nodes.get(id); } };
  renderPipeSpanMain({ spanInput: { nps: 2, schedule: 'Sch 40', service: 'VAPOUR', insulation: 'BARE', material: 'CS' } }, () => '<svg></svg>');
  assert.match(nodes.get('table-frame').innerHTML, /Selected method span/);
  assert.match(nodes.get('table-frame').innerHTML, /Least allowable span/);
  assert.match(nodes.get('inspector-body').innerHTML, /Formula trace/);
  delete globalThis.document;
});
