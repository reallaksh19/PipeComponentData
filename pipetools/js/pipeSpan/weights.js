const pi = Math.PI;
const pow = Math.pow;

export function pipeInsideDiameterMm(row) {
  return row.odMm - 2 * row.thicknessMm;
}

export function pipeWeightNPerM(row, constants) {
  const idMm = pipeInsideDiameterMm(row);
  const areaMm2 = pi * (pow(row.odMm, 2) - pow(idMm, 2)) / 4;
  return areaMm2 * constants.steelDensityGcm3 * 9.81 / 1000;
}

export function insulationWeightNPerM(row, constants) {
  return pi * (row.odMm + row.insulationMm) * row.insulationMm *
    constants.insulationDensityKgM3 * 9.81 / 1000000;
}

export function waterWeightNPerM(row, constants) {
  const idMm = pipeInsideDiameterMm(row);
  return pi * pow(idMm, 2) * constants.waterDensityKgM3 * 9.81 / 4000000;
}

export function momentOfInertiaCm4(row) {
  const idMm = pipeInsideDiameterMm(row);
  return pi * (pow(row.odMm, 4) - pow(idMm, 4)) / 64 / 10000;
}

export function activeWeightBreakdown(row, input, constants) {
  const pipe = pipeWeightNPerM(row, constants);
  const insulation = insulationWeightNPerM(row, constants);
  const water = waterWeightNPerM(row, constants);
  return {
    pipeWeightNPerM: pipe,
    insulationWeightNPerM: insulation,
    waterWeightNPerM: water,
    totalWeightNPerM: pipe +
      (input.insulation === 'INSULATED' ? insulation : 0) +
      (input.service === 'WATER' ? water : 0),
  };
}