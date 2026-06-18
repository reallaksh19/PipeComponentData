import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { calculatePipeSpan, getPipeSpanSchedules, listPipeSpanRows } from '../pipetools/js/pipeSpan/calculate.js';
import { PIPE_SPAN_VALIDATION_CASES } from '../pipetools/js/pipeSpan/catalog.js';
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

function near(actual, expected, tolerance = 0.01) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} not within ${tolerance} of ${expected}`);
}

test('Agent 07 modules stay below 200 lines', () => {
  for (const file of modules) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= 200, `${file} has ${lines} lines`);
  }
});

test('native pipe span catalog exposes Excel schedule data', () => {
  assert.ok(listPipeSpanRows().length >= 40);
  assert.ok(getPipeSpanSchedules(2).includes('Sch 40'));
  assert.ok(getPipeSpanSchedules(8).includes('Sch 40'));
});

test('calculation model matches uploaded Excel sample sheets', () => {
  for (const item of PIPE_SPAN_VALIDATION_CASES) {
    const result = calculatePipeSpan(item.input);
    for (const [key, expected] of Object.entries(item.expected)) {
      near(result[key], expected, 0.02);
    }
  }
});

test('formula trace is structured and auditable', () => {
  const result = calculatePipeSpan({ nps: 2, schedule: 'Sch 40', service: 'WATER', insulation: 'INSULATED' });
  const ids = result.formulaTrace.map((step) => step.id);
  for (const id of ['pipe-weight', 'water-weight', 'continuous-stress', 'continuous-deflection', 'governing']) {
    assert.ok(ids.includes(id), `${id} trace missing`);
  }
  assert.equal(result.formulaTrace.every((step) => step.formula && step.unit), true);
});

test('UI binding renders result table and formula trace', () => {
  const nodes = new Map();
  globalThis.document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, { textContent: '', innerHTML: '' }); return nodes.get(id); } };
  renderPipeSpanMain({ spanInput: { nps: 2, schedule: 'Sch 40', service: 'VAPOUR', insulation: 'BARE', material: 'CS' } }, () => '<svg></svg>');
  assert.match(nodes.get('table-frame').innerHTML, /Governing span/);
  assert.match(nodes.get('inspector-body').innerHTML, /Formula trace/);
  delete globalThis.document;
});