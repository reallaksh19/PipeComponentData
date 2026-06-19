const roundInput = (value) => typeof value === 'number' ? Number(value.toFixed(6)) : value;

export function traceStep(id, label, formula, inputs, result, unit) {
  return { id, label, formula, inputs: mapInputs(inputs), result: roundInput(result), unit };
}

function mapInputs(inputs) {
  return Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, roundInput(value)]));
}

function selectedFormula(method) {
  const label = method === 'SIMPLY' ? 'simply' : method === 'FIXED' ? 'fixed' : method === 'AVERAGE' ? 'average' : 'continuous';
  return `MIN(${label}DeflectionM, ${label}StressM)`;
}

export function createPipeSpanTrace(context) {
  const { row, constants, weights, mi, spans, indentation } = context;
  const { selectedMethodSpanM, leastAllowableSpanM, governingSpanM, beamMethod } = context;
  return [
    traceStep('pipe-weight', 'Empty pipe weight', 'π/4 × (OD²-ID²) × ρsteel × g', {
      odMm: row.odMm, idMm: row.odMm - 2 * row.thicknessMm, thicknessMm: row.thicknessMm,
    }, weights.pipeWeightNPerM, 'N/m'),
    traceStep('insulation-weight', 'Insulation weight', 'π × (OD+tins) × tins × ρins × g / 10⁶', {
      odMm: row.odMm, insulationMm: row.insulationMm, densityKgM3: constants.insulationDensityKgM3,
    }, weights.insulationWeightNPerM, 'N/m'),
    traceStep('water-weight', 'Water weight', 'π/4 × ID² × ρwater × g / 10⁶', {
      idMm: row.odMm - 2 * row.thicknessMm, densityKgM3: constants.waterDensityKgM3,
    }, weights.waterWeightNPerM, 'N/m'),
    traceStep('moment-inertia', 'Moment of inertia', 'π/64 × (OD⁴-ID⁴)', {
      odMm: row.odMm, idMm: row.odMm - 2 * row.thicknessMm,
    }, mi, 'cm4'),
    traceStep('continuous-stress', 'Continuous beam stress span', '√(240 × S × I / (OD × w))', {
      stressNmm2: constants.allowableStressNmm2, miCm4: mi, odMm: row.odMm, weightNPerM: weights.totalWeightNPerM,
    }, spans.continuousStressM, 'm'),
    traceStep('continuous-deflection', 'Continuous beam deflection span', '⁴√(384 × E × I × δ / (w × 100000))', {
      youngsModulusNmm2: constants.youngsModulusNmm2, miCm4: mi, deflectionMm: constants.allowableDeflectionMm,
      weightNPerM: weights.totalWeightNPerM,
    }, spans.continuousDeflectionM, 'm'),
    traceStep('selected-method', 'Selected method span', selectedFormula(beamMethod), {
      beamMethod,
    }, selectedMethodSpanM, 'm'),
    traceStep('least-allowable', 'Least of all calculated spans', 'MIN(indentationSpanM, all method stress/deflection spans)', {
      indentationSpanM: indentation,
    }, leastAllowableSpanM, 'm'),
    traceStep('governing', 'Governing span', 'MIN(selectedMethodSpanM, indentationSpanM)', {
      selectedMethodSpanM, indentationSpanM: indentation,
    }, governingSpanM, 'm'),
  ];
}
