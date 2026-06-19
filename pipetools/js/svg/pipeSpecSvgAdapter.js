const SUPPORTED = new Set(['PIPE', 'VALVE', 'FLANGE', 'FITTING', 'GASKET', 'REDUCER']);
const FITTINGS = new Set(['ELBOW_90', 'ELBOW_45', 'TEE_STRAIGHT', 'CAP']);
const FLANGES = new Set(['WN', 'SO', 'BLIND']);
const GASKETS = new Set(['FLAT_RING', 'RTJ', 'SPIRAL_WOUND']);
const VALVES = new Set(['GATE', 'GLOBE', 'BALL', 'SWING_CHECK', 'CHECK', 'BUTTERFLY']);
const REDUCERS = new Set(['CONCENTRIC', 'ECCENTRIC']);

function raw(row, ...paths) {
  for (const path of paths) {
    let value = row;
    for (const part of String(path).split('.')) value = value?.[part];
    if (value && typeof value === 'object' && 'value' in value) value = value.value;
    if (value !== '' && value != null) return value;
  }
  return null;
}

function n(row, ...paths) {
  const value = raw(row, ...paths);
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(value, fallback = '') {
  return value == null || value === '' ? fallback : String(value);
}

function txt(row, fallback, ...paths) {
  return textValue(raw(row, ...paths), fallback);
}

function token(value, fallback = '') {
  return textValue(value, fallback).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function upper(row, fallback, ...paths) {
  return token(txt(row, fallback, ...paths));
}

function rating(value) {
  return textValue(value).replace(/^CL\s*/i, '');
}

function subtype(row, fallback = '') {
  return upper(row, fallback, 'subtype', 'type', 'fittingType', 'flangeType', 'gasketType');
}

function common(row) {
  return {
    id: txt(row, '', 'id'),
    nps: txt(row, '', 'nps'),
    dn: n(row, 'dn'),
    standard: txt(row, '', 'standard'),
    dataStatus: txt(row, '', 'dataStatus'),
    source: txt(row, '', 'source'),
  };
}

function inferValveType(row) {
  const explicit = token(raw(row, 'valveType', 'subtype', 'type'), '');
  const source = token(raw(row, 'source'), '');
  const candidate = explicit || source;
  if (candidate.includes('SWING_CHECK') || candidate.includes('SWINGCHECK')) return 'SWING_CHECK';
  if (candidate.includes('CHECK') || candidate.includes('NON_RETURN')) return 'CHECK';
  if (candidate.includes('BUTTERFLY') || candidate.includes('WAFER')) return 'BUTTERFLY';
  if (candidate.includes('BALL')) return 'BALL';
  if (candidate.includes('GLOBE')) return 'GLOBE';
  if (candidate.includes('GATE')) return 'GATE';
  return explicit || 'UNKNOWN_VALVE';
}

function reducerType(row) {
  const value = upper(row, '', 'reducerType', 'subtype', 'type');
  if (value.includes('ECC')) return 'ECCENTRIC';
  if (value.includes('CONC')) return 'CONCENTRIC';
  return value || 'UNKNOWN_REDUCER';
}

function pipe(row) {
  return {
    ...common(row),
    componentType: 'PIPE',
    schedule: txt(row, '', 'schedule').replace(/^Sch\s*/i, ''),
    odMm: n(row, 'odMm', 'dimensions.odMm'),
    idMm: n(row, 'idMm', 'dimensions.idMm'),
    wallMm: n(row, 'wallMm', 'dimensions.wallMm'),
    weightKgPerM: n(row, 'weightKgPerM', 'weights.weightKgPerM', 'weights.emptyPipeKgPerM', 'weights.pipeKgPerM'),
  };
}

function valve(row) {
  return {
    ...common(row),
    componentType: 'VALVE',
    valveType: inferValveType(row),
    endType: upper(row, 'FLANGED', 'endType', 'endConnection'),
    classRating: rating(raw(row, 'classRating')),
    facing: upper(row, 'RF', 'facing'),
    faceToFaceRfMm: n(row, 'faceToFaceRfMm', 'faceToFaceMm', 'dimensions.faceToFaceRfMm', 'dimensions.faceToFaceMm'),
    heightMm: n(row, 'heightMm', 'dimensions.heightMm'),
    handwheelDiaMm: n(row, 'handwheelDiaMm', 'dimensions.handwheelDiaMm'),
    rfRtjKg: n(row, 'rfRtjKg', 'weightKg', 'weights.rfRtjKg', 'weights.weightKg'),
  };
}

function flange(row) {
  const type = upper(row, 'WN', 'subtype', 'flangeType', 'type');
  return {
    ...common(row),
    componentType: 'FLANGE',
    subtype: FLANGES.has(type) ? type : 'UNKNOWN_FLANGE',
    classRating: rating(raw(row, 'classRating')),
    facing: upper(row, 'RF', 'facing'),
    flangeOdMm: n(row, 'flangeOdMm', 'dimensions.flangeOdMm', 'dimensions.outerDiaMm'),
    flangeThicknessMm: n(row, 'flangeThicknessMm', 'dimensions.flangeThicknessMm'),
    rfDiaMm: n(row, 'rfDiaMm', 'dimensions.rfDiaMm'),
    rfHeightMm: n(row, 'rfHeightMm', 'dimensions.rfHeightMm'),
    pcdMm: n(row, 'pcdMm', 'bolting.pcdMm'),
    boltCount: n(row, 'boltCount', 'bolting.boltCount'),
    boltSizeMm: n(row, 'boltSizeMm', 'isoBoltSizeMm', 'bolting.boltSizeMm'),
    weightKg: n(row, 'weightKg', 'weights.weightKg'),
    weldDiaMm: n(row, 'weldDiaMm', 'dimensions.weldDiaMm'),
    wnLengthMm: n(row, 'wnLengthMm', 'dimensions.wnLengthMm'),
    soBoreMm: n(row, 'soBoreMm', 'dimensions.soBoreMm'),
    blindThickMm: n(row, 'blindThickMm', 'blindThicknessMm', 'dimensions.blindThickMm', 'dimensions.blindThicknessMm'),
  };
}

function fitting(row) {
  const type = subtype(row);
  return {
    ...common(row),
    componentType: 'FITTING',
    subtype: FITTINGS.has(type) ? type : 'UNKNOWN_FITTING',
    schedule: txt(row, '', 'schedule').replace(/^Sch\s*/i, ''),
    odMm: n(row, 'odMm', 'dimensions.odMm'),
    ctrToEndMm: n(row, 'ctrToEndMm', 'centerToEndMm', 'dimensions.centerToEndMm'),
    devLenMm: n(row, 'devLenMm', 'developedLengthMm', 'dimensions.developedLengthMm'),
    overCapMm: n(row, 'overCapMm', 'overallCapMm', 'dimensions.overCapMm', 'dimensions.overallCapMm'),
    weightKg: n(row, 'weightKg', 'weights.weightKg'),
  };
}

function reducer(row) {
  return {
    ...common(row),
    componentType: 'REDUCER',
    reducerType: reducerType(row),
    largeNps: txt(row, '', 'largeNps', 'npsLarge', 'runNps'),
    smallNps: txt(row, '', 'smallNps', 'npsSmall', 'branchNps'),
    schedule: txt(row, '', 'schedule', 'largeSchedule').replace(/^Sch\s*/i, ''),
    largeOdMm: n(row, 'largeOdMm', 'dimensions.largeOdMm', 'dimensions.odLargeMm'),
    smallOdMm: n(row, 'smallOdMm', 'dimensions.smallOdMm', 'dimensions.odSmallMm'),
    centerToEndMm: n(row, 'centerToEndMm', 'ctrToEndMm', 'dimensions.centerToEndMm'),
    weightKg: n(row, 'weightKg', 'weights.weightKg'),
  };
}

function gasket(row) {
  const type = subtype(row);
  return {
    ...common(row),
    componentType: 'GASKET',
    subtype: GASKETS.has(type) ? type : 'UNKNOWN_GASKET',
    classRating: rating(raw(row, 'classRating')),
    facing: upper(row, 'RF', 'facing'),
    outerDiaMm: n(row, 'outerDiaMm', 'dimensions.outerDiaMm'),
    innerDiaMm: n(row, 'innerDiaMm', 'dimensions.innerDiaMm'),
    thicknessMm: n(row, 'thicknessMm', 'dimensions.thicknessMm'),
  };
}

export function getPipeSpecSvgQuality(row = {}) {
  const normalized = toPipeSpecSvgRow(row);
  const ct = normalized.componentType;
  if (!SUPPORTED.has(ct)) return quality('MISSING_TEMPLATE', false, 'Unsupported component family');
  if (ct === 'VALVE') {
    return VALVES.has(normalized.valveType)
      ? quality('COMPONENT_TEMPLATE', true, `${normalized.valveType} valve uses a dedicated symbol template`)
      : quality('MISSING_TEMPLATE', false, `${normalized.valveType} valve needs a dedicated symbol, no generic valve fallback`);
  }
  if (ct === 'REDUCER') {
    return REDUCERS.has(normalized.reducerType)
      ? quality('COMPONENT_TEMPLATE', true, `${normalized.reducerType} reducer template available`)
      : quality('MISSING_TEMPLATE', false, `${normalized.reducerType} reducer template pending`);
  }
  if (ct === 'FITTING' && !FITTINGS.has(normalized.subtype)) return quality('MISSING_TEMPLATE', false, `${normalized.subtype} fitting template pending`);
  if (ct === 'FLANGE' && !FLANGES.has(normalized.subtype)) return quality('MISSING_TEMPLATE', false, `${normalized.subtype} flange template pending`);
  if (ct === 'GASKET' && !GASKETS.has(normalized.subtype)) return quality('MISSING_TEMPLATE', false, `${normalized.subtype} gasket template pending`);
  return quality('COMPONENT_TEMPLATE', true, 'Component-specific source-backed template available');
}

function quality(status, renderable, reason) {
  return { status, renderable, reason };
}

export function hasPipeSpecSvgSupport(row = {}) {
  return getPipeSpecSvgQuality(row).renderable;
}

export function getPipeSpecSvgKey(row = {}) {
  const normalized = toPipeSpecSvgRow(row);
  const ct = normalized.componentType;
  if (ct === 'VALVE') return ['VALVE', normalized.valveType, normalized.endType, normalized.facing ?? 'NA'].join('_');
  if (ct === 'REDUCER') return ['REDUCER', normalized.reducerType, normalized.largeNps || 'NA', normalized.smallNps || 'NA'].join('_');
  if (ct === 'FLANGE') return ['FLANGE', normalized.subtype, normalized.facing ?? 'NA', `CL${normalized.classRating}`].join('_');
  if (ct === 'FITTING') return ['FITTING', normalized.subtype, normalized.schedule || 'NA'].join('_');
  if (ct === 'GASKET') return ['GASKET', normalized.subtype, normalized.facing ?? 'NA'].join('_');
  if (ct === 'PIPE') return ['PIPE', normalized.schedule || 'GENERIC'].join('_');
  return [ct || 'UNKNOWN', subtype(row, 'GENERIC')].join('_');
}

export function toPipeSpecSvgRow(row = {}) {
  const ct = upper(row, '', 'componentType', 'family', 'component');
  if (ct === 'PIPE') return pipe(row);
  if (ct === 'VALVE') return valve(row);
  if (ct === 'FLANGE') return flange(row);
  if (ct === 'FITTING') return fitting(row);
  if (ct === 'GASKET') return gasket(row);
  if (ct === 'REDUCER') return reducer(row);
  return { ...common(row), componentType: ct || 'UNKNOWN', supported: false };
}

export const PIPE_SPEC_SVG_SUPPORTED_TYPES = Object.freeze({
  componentTypes: [...SUPPORTED],
  valves: [...VALVES],
  reducers: [...REDUCERS],
  fittings: [...FITTINGS],
  flanges: [...FLANGES],
  gaskets: [...GASKETS],
});
