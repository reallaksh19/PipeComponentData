const SUPPORTED = new Set(['PIPE', 'VALVE', 'FLANGE', 'FITTING', 'GASKET']);
const FITTINGS = new Set(['ELBOW_90', 'ELBOW_45', 'TEE_STRAIGHT', 'CAP']);
const FLANGES = new Set(['WN', 'SO', 'BLIND']);
const GASKETS = new Set(['FLAT_RING', 'RTJ', 'SPIRAL_WOUND']);

function n(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value, fallback = '') {
  return value == null || value === '' ? fallback : String(value);
}

function rating(value) {
  return text(value).replace(/^CL\s*/i, '');
}

function common(row) {
  return {
    id: text(row.id),
    nps: text(row.nps),
    dn: n(row.dn),
    standard: text(row.standard),
    dataStatus: text(row.dataStatus),
    source: text(row.source),
  };
}

function pipe(row) {
  return {
    ...common(row),
    componentType: 'PIPE',
    schedule: text(row.schedule).replace(/^Sch\s*/i, ''),
    odMm: n(row.odMm),
    idMm: n(row.idMm),
    wallMm: n(row.wallMm),
    weightKgPerM: n(row.weightKgPerM),
  };
}

function valve(row) {
  return {
    ...common(row),
    componentType: 'VALVE',
    valveType: text(row.valveType || row.subtype, 'GATE').toUpperCase(),
    endType: text(row.endType, 'FLANGED').toUpperCase(),
    classRating: rating(row.classRating),
    facing: text(row.facing, 'RF').toUpperCase(),
    faceToFaceRfMm: n(row.faceToFaceRfMm ?? row.faceToFaceMm),
    heightMm: n(row.heightMm),
    handwheelDiaMm: n(row.handwheelDiaMm),
    rfRtjKg: n(row.rfRtjKg ?? row.weightKg),
  };
}

function flange(row) {
  const subtype = text(row.subtype, 'WN').toUpperCase();
  return {
    ...common(row),
    componentType: 'FLANGE',
    subtype: FLANGES.has(subtype) ? subtype : 'WN',
    classRating: rating(row.classRating),
    flangeOdMm: n(row.flangeOdMm),
    flangeThicknessMm: n(row.flangeThicknessMm),
    rfDiaMm: n(row.rfDiaMm),
    rfHeightMm: n(row.rfHeightMm),
    pcdMm: n(row.pcdMm),
    boltCount: n(row.boltCount),
    boltSizeMm: n(row.boltSizeMm ?? row.isoBoltSizeMm),
    weightKg: n(row.weightKg),
    weldDiaMm: n(row.weldDiaMm),
    wnLengthMm: n(row.wnLengthMm),
    soBoreMm: n(row.soBoreMm),
    blindThickMm: n(row.blindThickMm ?? row.blindThicknessMm),
  };
}

function fitting(row) {
  const subtype = text(row.subtype).toUpperCase();
  return {
    ...common(row),
    componentType: 'FITTING',
    subtype: FITTINGS.has(subtype) ? subtype : 'UNKNOWN_FITTING',
    schedule: text(row.schedule).replace(/^Sch\s*/i, ''),
    odMm: n(row.odMm),
    ctrToEndMm: n(row.ctrToEndMm ?? row.centerToEndMm),
    devLenMm: n(row.devLenMm ?? row.developedLengthMm),
    overCapMm: n(row.overCapMm ?? row.overallCapMm),
    weightKg: n(row.weightKg),
  };
}

function gasket(row) {
  const subtype = text(row.subtype).toUpperCase();
  return {
    ...common(row),
    componentType: 'GASKET',
    subtype: GASKETS.has(subtype) ? subtype : 'UNKNOWN_GASKET',
    classRating: rating(row.classRating),
    facing: text(row.facing, 'RF').toUpperCase(),
    outerDiaMm: n(row.outerDiaMm),
    innerDiaMm: n(row.innerDiaMm),
    thicknessMm: n(row.thicknessMm),
  };
}

export function hasPipeSpecSvgSupport(row = {}) {
  const ct = text(row.componentType || row.family).toUpperCase();
  if (!SUPPORTED.has(ct)) return false;
  if (ct === 'FITTING') return FITTINGS.has(text(row.subtype).toUpperCase());
  if (ct === 'FLANGE') return FLANGES.has(text(row.subtype, 'WN').toUpperCase());
  if (ct === 'GASKET') return GASKETS.has(text(row.subtype).toUpperCase());
  if (ct === 'VALVE') return text(row.valveType || row.subtype, 'GATE').toUpperCase() === 'GATE';
  return true;
}

export function toPipeSpecSvgRow(row = {}) {
  const ct = text(row.componentType || row.family).toUpperCase();
  if (ct === 'PIPE') return pipe(row);
  if (ct === 'VALVE') return valve(row);
  if (ct === 'FLANGE') return flange(row);
  if (ct === 'FITTING') return fitting(row);
  if (ct === 'GASKET') return gasket(row);
  return { ...common(row), componentType: 'UNKNOWN', supported: false };
}

export const PIPE_SPEC_SVG_SUPPORTED_TYPES = Object.freeze({
  componentTypes: [...SUPPORTED],
  fittings: [...FITTINGS],
  flanges: [...FLANGES],
  gaskets: [...GASKETS],
});
