import { PIPE_SPAN_CONSTANTS, PIPE_SPAN_ROWS, QMS_CS_REFERENCE } from './data.js';

const round = (value, digits = 3) => Number(value.toFixed(digits));
const pow = Math.pow;
const pi = Math.PI;

export function getPipeSpanRow(nps) {
  const row = PIPE_SPAN_ROWS.find((item) => Number(item.nps) === Number(nps));
  if (!row) throw new Error(`Pipe span row not available for NPS ${nps}`);
  return row;
}

function pipeWeightNPerM(row, constants) {
  const idMm = row.odMm - 2 * row.thicknessMm;
  const areaMm2 = pi * (pow(row.odMm, 2) - pow(idMm, 2)) / 4;
  return areaMm2 * constants.steelDensityGcm3 * 9.81 / 1000;
}

function insulationWeightNPerM(row, constants) {
  return pi * (row.odMm + row.insulationMm) * row.insulationMm *
    constants.insulationDensityKgM3 * 9.81 / 1000000;
}

function waterWeightNPerM(row, constants) {
  const idMm = row.odMm - 2 * row.thicknessMm;
  return pi * pow(idMm, 2) * constants.waterDensityKgM3 * 9.81 / 4000000;
}

function momentOfInertiaCm4(row) {
  const idMm = row.odMm - 2 * row.thicknessMm;
  return pi * (pow(row.odMm, 4) - pow(idMm, 4)) / 64 / 10000;
}

function totalWeight(row, input, constants) {
  let total = pipeWeightNPerM(row, constants);
  if (input.insulation === 'INSULATED') total += insulationWeightNPerM(row, constants);
  if (input.service === 'WATER') total += waterWeightNPerM(row, constants);
  return total;
}

function qmsReferenceMm(input) {
  const ref = QMS_CS_REFERENCE.find((item) => Number(item.nps) === Number(input.nps));
  if (!ref) return null;
  const key = `${input.service.toLowerCase()}${input.insulation === 'INSULATED' ? 'Insulated' : 'Bare'}Mm`;
  return ref[key] ?? null;
}

function spanCases(row, weightNPerM, constants) {
  const i = momentOfInertiaCm4(row);
  const od = row.odMm;
  const s = constants.allowableStressNmm2;
  const e = constants.youngsModulusNmm2;
  const deflection = constants.allowableDeflectionMm;
  return {
    simplyDeflectionM: pow((384 * e * i * deflection) / (5 * weightNPerM * 100000), 0.25),
    simplyStressM: pow((160 * s * i) / (od * weightNPerM), 0.5),
    continuousDeflectionM: pow((384 * e * i * deflection) / (weightNPerM * 100000), 0.25),
    continuousStressM: pow((240 * s * i) / (od * weightNPerM), 0.5),
    averageDeflectionM: pow((128 * e * i * deflection) / (weightNPerM * 100000), 0.25),
    averageStressM: pow((200 * s * i) / (od * weightNPerM), 0.5),
  };
}

export function calculatePipeSpan(input, constants = PIPE_SPAN_CONSTANTS) {
  const row = getPipeSpanRow(input.nps);
  const pipeWeight = pipeWeightNPerM(row, constants);
  const insWeight = insulationWeightNPerM(row, constants);
  const waterWeight = waterWeightNPerM(row, constants);
  const total = totalWeight(row, input, constants);
  const bearingWidthMm = constants.bearingBaseMmFor42In * row.odMm / constants.bearingBaseOdMm;
  const mi = momentOfInertiaCm4(row);
  const indentM = constants.allowableIndentationStressNmm2 *
    (constants.bearingLengthMm + bearingWidthMm) * pow(row.thicknessMm, 2) /
    (0.644 * total * pow((row.odMm / 2) * row.thicknessMm, 0.5));
  const cases = spanCases(row, total, constants);
  const governingSpanM = Math.min(indentM, ...Object.values(cases));
  const qmsMm = qmsReferenceMm(input);
  return {
    row,
    pipeWeightNPerM: round(pipeWeight),
    insulationWeightNPerM: round(insWeight),
    waterWeightNPerM: round(waterWeight),
    totalWeightNPerM: round(total),
    bearingWidthMm: round(bearingWidthMm),
    momentOfInertiaCm4: round(mi),
    indentationSpanM: round(indentM),
    ...Object.fromEntries(Object.entries(cases).map(([key, value]) => [key, round(value)])),
    governingSpanM: round(governingSpanM),
    qmsReferenceM: qmsMm ? round(qmsMm / 1000) : null,
  };
}
