import {
  DEFAULT_PIPE_SPAN_INPUT, PIPE_SPAN_CONSTANTS, PIPE_SPAN_ROWS, QMS_REFERENCE,
} from './catalog.js';
import { activeWeightBreakdown, momentOfInertiaCm4 } from './weights.js';
import { bearingWidthMm, indentationSpanM, spanCases } from './spans.js';
import { createPipeSpanTrace } from './trace.js';

const round = (value, digits = 3) => Number(value.toFixed(digits));

export function listPipeSpanRows() {
  return PIPE_SPAN_ROWS;
}

export function getPipeSpanRow(nps, schedule = null) {
  const sizeMatches = PIPE_SPAN_ROWS.filter((row) => Number(row.nps) === Number(nps));
  if (!sizeMatches.length) throw new Error(`Pipe span row not available for NPS ${nps}`);
  return schedule ? sizeMatches.find((row) => row.schedule === schedule) ?? sizeMatches[0] : sizeMatches[0];
}

export function getPipeSpanSchedules(nps) {
  return PIPE_SPAN_ROWS.filter((row) => Number(row.nps) === Number(nps)).map((row) => row.schedule);
}

function qmsKey(input, rack = false) {
  const service = input.service === 'WATER' ? 'water' : 'vapour';
  const insulation = input.insulation === 'INSULATED' ? 'Insulated' : 'Bare';
  return `${rack ? 'rack' : ''}${rack ? service[0].toUpperCase() + service.slice(1) : service}${insulation}Mm`;
}

export function qmsReference(input) {
  const materialRows = QMS_REFERENCE[input.material] ?? QMS_REFERENCE.CS;
  const ref = materialRows.find((item) => Number(item.nps) === Number(input.nps));
  if (!ref) return { supportStandardMm: null, rackSpanMm: null, selectedMm: null };
  const supportStandardMm = ref[qmsKey(input, false)] ?? null;
  const rackSpanMm = ref[qmsKey(input, true)] ?? null;
  return { supportStandardMm, rackSpanMm, selectedMm: rackSpanMm ?? supportStandardMm };
}

export function calculatePipeSpan(userInput = {}, constants = PIPE_SPAN_CONSTANTS) {
  const input = { ...DEFAULT_PIPE_SPAN_INPUT, ...userInput };
  const row = getPipeSpanRow(input.nps, input.schedule);
  const weights = activeWeightBreakdown(row, input, constants);
  const mi = momentOfInertiaCm4(row);
  const indentation = indentationSpanM(row, weights.totalWeightNPerM, constants);
  const cases = spanCases(row, weights.totalWeightNPerM, constants, mi);
  const governing = governingByMethod(cases, indentation, input.beamMethod);
  const qms = qmsReference(input);
  const raw = { row, ...weights, bearingWidthMm: bearingWidthMm(row, constants), momentOfInertiaCm4: mi,
    indentationSpanM: indentation, ...cases, governingSpanM: governing,
    qmsReferenceM: qms.selectedMm ? qms.selectedMm / 1000 : null,
    qmsSupportStandardM: qms.supportStandardMm ? qms.supportStandardMm / 1000 : null,
    qmsRackSpanM: qms.rackSpanMm ? qms.rackSpanMm / 1000 : null };
  const rounded = Object.fromEntries(Object.entries(raw).map(([key, value]) =>
    [key, typeof value === 'number' ? round(value) : value]));
  rounded.input = input;
  rounded.formulaTrace = createPipeSpanTrace({ row, constants, weights, mi, spans: cases, indentation, governing });
  return rounded;
}

function governingByMethod(cases, indentation, method = 'CONTINUOUS') {
  if (method === 'SIMPLY') return Math.min(cases.simplyDeflectionM, cases.simplyStressM);
  if (method === 'AVERAGE') return Math.min(cases.averageDeflectionM, cases.averageStressM);
  if (method === 'FIXED') return Math.min(cases.fixedDeflectionM, cases.fixedStressM);
  if (method === 'LEAST_ALL') return Math.min(indentation, ...Object.values(cases));
  return Math.min(cases.continuousDeflectionM, cases.continuousStressM);
}