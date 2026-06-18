const pow = Math.pow;

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
  return {
    simplyDeflectionM: deflectionSpanM(76.8, row, weightNPerM, constants, momentOfInertiaCm4),
    simplyStressM: stressSpanM(160, row, weightNPerM, constants, momentOfInertiaCm4),
    continuousDeflectionM: deflectionSpanM(384, row, weightNPerM, constants, momentOfInertiaCm4),
    continuousStressM: stressSpanM(240, row, weightNPerM, constants, momentOfInertiaCm4),
    fixedDeflectionM: deflectionSpanM(384, row, weightNPerM, constants, momentOfInertiaCm4),
    fixedStressM: stressSpanM(240, row, weightNPerM, constants, momentOfInertiaCm4),
    averageDeflectionM: deflectionSpanM(128, row, weightNPerM, constants, momentOfInertiaCm4),
    averageStressM: stressSpanM(200, row, weightNPerM, constants, momentOfInertiaCm4),
  };
}

export function governingSpanM(cases, indentation) {
  return Math.min(indentation, ...Object.values(cases).filter((value) => Number.isFinite(value)));
}