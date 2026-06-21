export function valueFromPaths(row = {}, ...paths) {
  const match = firstPathValue(row, paths);
  return match ? match.value : null;
}

export function dimensionFacts(row = {}) {
  const specs = [
    ['F2F RF', 'faceToFaceRfMm', 'faceToFaceMm', 'dimensions.faceToFaceRfMm', 'dimensions.faceToFaceMm'],
    ['F2F RTJ', 'faceToFaceRtjMm', 'dimensions.faceToFaceRtjMm'],
    ['BW length', 'buttWeldLengthMm', 'dimensions.buttWeldLengthMm'],
    ['Height', 'heightMm', 'dimensions.heightMm'],
    ['HW dia', 'handwheelDiaMm', 'dimensions.handwheelDiaMm'],
    ['RTJ add', 'rtjAddLengthMm', 'dimensions.rtjAddLengthMm'],
    ['Gap', 'gapMm', 'dimensions.gapMm'],
    ['OD', 'odMm', 'flangeOdMm', 'outerDiaMm', 'outerDiameterMm', 'dimensions.odMm', 'dimensions.flangeOdMm', 'dimensions.outerDiaMm', 'dimensions.outerDiameterMm'],
    ['ID', 'idMm', 'innerDiaMm', 'innerDiameterMm', 'dimensions.idMm', 'dimensions.innerDiaMm', 'dimensions.innerDiameterMm'],
    ['Wall / Thk', 'wallMm', 'wallThicknessMm', 'thicknessMm', 'flangeThicknessMm', 'dimensions.wallMm', 'dimensions.wallThicknessMm', 'dimensions.thicknessMm', 'dimensions.flangeThicknessMm'],
    ['RF dia', 'rfDiaMm', 'dimensions.rfDiaMm'],
    ['RF height', 'rfHeightMm', 'dimensions.rfHeightMm'],
    ['PCD', 'pcdMm', 'dimensions.pcdMm'],
    ['Bolt count', 'boltCount', 'bolting.boltCount'],
    ['Bolt size', 'boltSizeMm', 'isoBoltSizeMm', 'bolting.boltSizeMm'],
    ['C-E', 'centerToEndMm', 'ctrToEndMm', 'dimensions.centerToEndMm'],
    ['Dev. len', 'developedLengthMm', 'devLenMm', 'dimensions.developedLengthMm'],
    ['Over cap', 'overCapMm', 'overallCapMm', 'dimensions.overCapMm', 'dimensions.overallCapMm'],
  ];
  return specs.map(([label, ...paths]) => makeFact(label, firstPathValue(row, paths), unitFor(label))).filter(Boolean);
}

export function weightFacts(row = {}) {
  const specs = [
    ['Weight', 'weightKg', 'weights.weightKg'],
    ['RF/RTJ weight', 'rfRtjKg', 'weights.rfRtjKg'],
    ['BW weight', 'buttWeldKg', 'weights.buttWeldKg'],
    ['Weight / m', 'weightKgPerM', 'weights.weightKgPerM', 'weights.kgPerM', 'weights.emptyPipeKgPerM', 'weights.pipeKgPerM'],
  ];
  return specs.map(([label, ...paths]) => makeFact(label, firstPathValue(row, paths), label === 'Weight / m' ? 'kg/m' : 'kg')).filter(Boolean);
}

export function firstDimensionText(row = {}) {
  const fact = dimensionFacts(row)[0];
  return fact ? `${fact.label} ${formatFact(fact)}` : '—';
}

export function firstWeightText(row = {}) {
  const fact = weightFacts(row)[0];
  return fact ? formatFact(fact) : '—';
}

export function formatDimensionValue(value) {
  return formatValue(unwrap(value), 'mm');
}

export function formatWeightValue(value) {
  return formatValue(unwrap(value), 'kg');
}

export function formatFact(fact) {
  return fact?.unit ? `${fact.value} ${fact.unit}` : String(fact?.value ?? '—');
}

function makeFact(label, match, unit) {
  if (!match || match.value == null || match.value === '') return null;
  return { label, value: match.value, unit, path: match.path };
}

function unitFor(label) {
  if (label === 'Bolt count') return '';
  return 'mm';
}

function firstPathValue(row, paths = []) {
  for (const path of paths) {
    const value = unwrap(readPath(row, path));
    if (value !== '' && value != null) return { value, path };
  }
  return null;
}

function readPath(row, path) {
  let value = row;
  for (const part of String(path).split('.')) value = value?.[part];
  return value;
}

function unwrap(value) {
  if (value && typeof value === 'object' && 'value' in value) return value.value;
  return value;
}

function formatValue(value, unit) {
  return value == null || value === '' ? '—' : `${value} ${unit}`;
}
