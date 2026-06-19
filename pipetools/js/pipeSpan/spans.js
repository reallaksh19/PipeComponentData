const pow = Math.pow;

const METHOD_KEYS = Object.freeze({
  SIMPLY: ['simplyDeflectionM', 'simplyStressM'],
  CONTINUOUS: ['continuousDeflectionM', 'continuousStressM'],
  FIXED: ['fixedDeflectionM', 'fixedStressM'],
  AVERAGE: ['averageDeflectionM', 'averageStressM'],
});

export function bearingWidthMm(row, constants) {
  return constants.bearingBaseMmFor42In * row.odMm / constants.bearingBaseOdMm;
}

export function indentationSpanM(row, weightNPerM, constants) {
  return constants.allowableIndentationStressNmm2 *
    (constants.bearingLengthMm + bearingWidthMm(row, constants)) * pow(row.thicknessMm, 2) /
    (0.644 * weightNPerM * pow((row.odMm / 2) * row.thicknessMm, 0.5));
}

export function deflectionSpanM(factor, row, weightNPerM, constants, momentOfInertiaCm4) {
  return pow((factor * constants.youngsModulusNmm2 * momentOfInertiaCm4 *
    constants.allowableDeflectionMm) / (weightNPerM * 100000), 0.25);
}

export function stressSpanM(factor, row, weightNPerM, constants, momentOfInertiaCm4) {
  return pow((factor * constants.allowableStressNmm2 * momentOfInertiaCm4) /
    (row.odMm * weightNPerM), 0.5);
}

export function spanCases(row, weightNPerM, constants, momentOfInertiaCm4) {
  const simplyDeflectionM = deflectionSpanM(76.8, row, weightNPerM, constants, momentOfInertiaCm4);
  const simplyStressM = stressSpanM(160, row, weightNPerM, constants, momentOfInertiaCm4);
  const continuousDeflectionM = deflectionSpanM(384, row, weightNPerM, constants, momentOfInertiaCm4);
  const continuousStressM = stressSpanM(240, row, weightNPerM, constants, momentOfInertiaCm4);
  const civilContinuousDeflectionM = deflectionSpanM(192, row, weightNPerM, constants, momentOfInertiaCm4);
  const civilContinuousStressM = stressSpanM(160, row, weightNPerM, constants, momentOfInertiaCm4);
  const fixedDeflectionM = deflectionSpanM(384, row, weightNPerM, constants, momentOfInertiaCm4);
  const fixedStressM = stressSpanM(240, row, weightNPerM, constants, momentOfInertiaCm4);
  const kellogDeflectionM = deflectionSpanM(100, row, weightNPerM, constants, momentOfInertiaCm4);
  const kellogStressM = stressSpanM(200, row, weightNPerM, constants, momentOfInertiaCm4);
  const averageDeflectionM = deflectionSpanM(128, row, weightNPerM, constants, momentOfInertiaCm4);
  const averageStressM = stressSpanM(200, row, weightNPerM, constants, momentOfInertiaCm4);
  return { simplyDeflectionM, simplyStressM, continuousDeflectionM, continuousStressM,
    civilContinuousDeflectionM, civilContinuousStressM, fixedDeflectionM, fixedStressM,
    kellogDeflectionM, kellogStressM, averageDeflectionM, averageStressM };
}

export function selectedMethodSpanM(cases, method = 'CONTINUOUS') {
  const keys = METHOD_KEYS[method] ?? METHOD_KEYS.CONTINUOUS;
  return Math.min(...keys.map((key) => cases[key]).filter(Number.isFinite));
}

export function leastAllowableSpanM(cases, indentation) {
  return Math.min(indentation, ...Object.values(cases).filter(Number.isFinite));
}

export function governingSpanM(cases, indentation, method = 'CONTINUOUS') {
  return Math.min(indentation, selectedMethodSpanM(cases, method));
}
