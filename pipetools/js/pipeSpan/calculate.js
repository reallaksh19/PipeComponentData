import {
  DEFAULT_PIPE_SPAN_INPUT, PIPE_SPAN_CONSTANTS, PIPE_SPAN_ROWS, QMS_REFERENCE,
} from './catalog.js';
import { activeWeightBreakdown, momentOfInertiaCm4 } from './weights.js';
import {
  bearingWidthMm, governingSpanM, indentationSpanM, leastAllowableSpanM,
  selectedMethodSpanM, spanCases,
} from './spans.js';
import { createPipeSpanTrace } from './trace.js';

const round = (value, digits = 3) => Number(value.toFixed(digits));

export function listPipeSpanRows() {
  return PIPE_SPAN_ROWS;
}

export function getPipeSpanSchedules(nps) {
  return PIPE_SPAN_ROWS.filter((row) => Number(row.nps) === Number(nps)).map((row) => row.schedule);
}

export function normalizePipeSpanInput(userInput = {}) {
  const input = { ...DEFAULT_PIPE_SPAN_INPUT, ...userInput };
  const schedules = getPipeSpanSchedules(input.nps);
  if (!schedules.length) throw new Error(`Pipe span row not available for NPS ${input.nps}`);
  const schedule = schedules.includes(input.schedule) ? input.schedule : schedules[0];
  return { ...input, schedule };
}

export function getPipeSpanRow(nps, schedule = null) {
  const sizeMatches = PIPE_SPAN_ROWS.filter((row) => Number(row.nps) === Number(nps));
  if (!sizeMatches.length) throw new Error(`Pipe span row not available for NPS ${nps}`);
  if (!schedule) return sizeMatches[0];
  const match = sizeMatches.find((row) => row.schedule === schedule);
  if (!match) throw new Error(`Schedule ${schedule} not available for NPS ${nps}`);
  return match;
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
  const input = normalizePipeSpanInput(userInput);
  const row = getPipeSpanRow(input.nps, input.schedule);
  const weights = activeWeightBreakdown(row, input, constants);
  const mi = momentOfInertiaCm4(row);
  const indentation = indentationSpanM(row, weights.totalWeightNPerM, constants);
  const cases = spanCases(row, weights.totalWeightNPerM, constants, mi);
  const selectedSpan = selectedMethodSpanM(cases, input.beamMethod);
  const leastSpan = leastAllowableSpanM(cases, indentation);
  const governingSpan = governingSpanM(cases, indentation, input.beamMethod);
  const qms = qmsReference(input);
  const raw = { row, ...weights, bearingWidthMm: bearingWidthMm(row, constants), momentOfInertiaCm4: mi,
    indentationSpanM: indentation, ...cases, selectedMethodSpanM: selectedSpan,
    leastAllowableSpanM: leastSpan, governingSpanM: governingSpan,
    qmsReferenceM: qms.selectedMm ? qms.selectedMm / 1000 : null,
    qmsSupportStandardM: qms.supportStandardMm ? qms.supportStandardMm / 1000 : null,
    qmsRackSpanM: qms.rackSpanMm ? qms.rackSpanMm / 1000 : null };
  const rounded = Object.fromEntries(Object.entries(raw).map(([key, value]) =>
    [key, typeof value === 'number' ? round(value) : value]));
  rounded.input = input;
  rounded.formulaTrace = createRoundedTrace(row, constants, rounded, input.beamMethod);
  return rounded;
}

function createRoundedTrace(row, constants, result, beamMethod) {
  const weights = { pipeWeightNPerM: result.pipeWeightNPerM, insulationWeightNPerM: result.insulationWeightNPerM,
    waterWeightNPerM: result.waterWeightNPerM, totalWeightNPerM: result.totalWeightNPerM };
  const spans = Object.fromEntries(Object.entries(result).filter(([key]) => key.endsWith('M')));
  return createPipeSpanTrace({ row, constants, weights, mi: result.momentOfInertiaCm4,
    spans, indentation: result.indentationSpanM, selectedMethodSpanM: result.selectedMethodSpanM,
    leastAllowableSpanM: result.leastAllowableSpanM, governingSpanM: result.governingSpanM, beamMethod });
}
