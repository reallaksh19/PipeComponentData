import { splitCsvRows } from '../sourceParsers/csvCells.js';

export function oletCatalogKey({ oletType, nps, scheduleOrRating }) {
  return `OLET|${oletType}|NPS${nps}|${scheduleOrRating}`;
}

export function parseWeldoletCsv(text, options = {}) {
  const rows = splitCsvRows(text);
  const headers = rows[1] ?? [];
  const schedule = options.schedule ?? 'STD';
  const source = options.source ?? '';
  
  return rows.slice(2).map((cells, index) => {
    const raw = Object.fromEntries(headers.map((header, columnIndex) => [header.trim(), clean(cells[columnIndex])]));
    if (!raw['NB inche'] && !raw.OD && !raw.KG) return null;
    
    return makeOletRow({
      oletType: 'WELDOLET',
      nps: String(raw['NB inche']),
      dn: numberOrNull(raw['NB mm']),
      scheduleOrRating: `SCH${schedule}`,
      source,
      sourceRowNumber: index + 3,
      dimensions: {
        heightAMm: taggedNumber(raw['Height A'], 'Height A'),
        odMm: taggedNumber(raw.OD, 'OD'),
        holeMm: taggedNumber(raw.Hole, 'Hole'),
        socketBoreMm: unavailable('D'),
        socketDepthMm: unavailable('E'),
        socketOdMm: unavailable('F'),
        threadLengthMm: unavailable('G'),
        threadPitchMm: unavailable('H'),
        innerBoreMm: unavailable('I'),
      },
      weights: {
        weightKg: taggedNumber(raw.KG || raw.Kg, 'KG'),
      }
    });
  }).filter(Boolean);
}

export function parseSockoletCsv(text, options = {}) {
  const rows = splitCsvRows(text);
  const headers = rows[1] ?? [];
  const rating = options.rating ?? '3000';
  const source = options.source ?? '';
  
  return rows.slice(2).map((cells, index) => {
    const raw = Object.fromEntries(headers.map((header, columnIndex) => [header.trim(), clean(cells[columnIndex])]));
    if (!raw['NB inche'] && !raw.OD && !raw.Kg) return null;
    
    return makeOletRow({
      oletType: 'SOCKOLET',
      nps: String(raw['NB inche']),
      dn: numberOrNull(raw['NB mm']),
      scheduleOrRating: String(rating),
      source,
      sourceRowNumber: index + 3,
      dimensions: {
        heightAMm: taggedNumber(raw['Height A'], 'Height A'),
        odMm: taggedNumber(raw.OD, 'OD'),
        holeMm: taggedNumber(raw.Hole, 'Hole'),
        socketBoreMm: taggedNumber(raw.D, 'D'),
        socketDepthMm: taggedNumber(raw.E, 'E'),
        socketOdMm: taggedNumber(raw.F, 'F'),
        threadLengthMm: unavailable('G'),
        threadPitchMm: unavailable('H'),
        innerBoreMm: taggedNumber(raw.I, 'I'),
      },
      weights: {
        weightKg: taggedNumber(raw.Kg || raw.KG, 'Kg'),
      }
    });
  }).filter(Boolean);
}

export function parseThredoletCsv(text, options = {}) {
  const rows = splitCsvRows(text);
  const headers = rows[1] ?? [];
  const rating = options.rating ?? '3000';
  const source = options.source ?? '';
  
  return rows.slice(2).map((cells, index) => {
    const raw = Object.fromEntries(headers.map((header, columnIndex) => [header.trim(), clean(cells[columnIndex])]));
    if (!raw['NB inche'] && !raw.OD && !raw.KG && !raw.Kg) return null;
    
    return makeOletRow({
      oletType: 'THREDOLET',
      nps: String(raw['NB inche']),
      dn: numberOrNull(raw['NB mm']),
      scheduleOrRating: String(rating),
      source,
      sourceRowNumber: index + 3,
      dimensions: {
        heightAMm: taggedNumber(raw['Height A'], 'Height A'),
        odMm: taggedNumber(raw.OD, 'OD'),
        holeMm: taggedNumber(raw.Hole, 'Hole'),
        socketBoreMm: unavailable('D'),
        socketDepthMm: unavailable('E'),
        socketOdMm: taggedNumber(raw['OD 2'], 'OD 2'),
        threadLengthMm: unavailable('G'),
        threadPitchMm: unavailable('H'),
        innerBoreMm: unavailable('I'),
      },
      weights: {
        weightKg: taggedNumber(raw.KG || raw.Kg, 'KG'),
      }
    });
  }).filter(Boolean);
}

export function parseElboletCsv(text, options = {}) {
  const rows = splitCsvRows(text);
  const headers = rows[1] ?? [];
  const rating = options.rating ?? '3000';
  const source = options.source ?? '';
  
  return rows.slice(2).map((cells, index) => {
    const raw = Object.fromEntries(headers.map((header, columnIndex) => [header.trim(), clean(cells[columnIndex])]));
    if (!raw['NB inche'] && !raw.OD && !raw.Kg && !raw.KG) return null;
    
    return makeOletRow({
      oletType: 'ELBOLET',
      nps: String(raw['NB inche']),
      dn: numberOrNull(raw['NB mm']),
      scheduleOrRating: String(rating),
      source,
      sourceRowNumber: index + 3,
      dimensions: {
        heightAMm: taggedNumber(raw['Height A'], 'Height A'),
        odMm: taggedNumber(raw.OD, 'OD'),
        holeMm: taggedNumber(raw.Hole, 'Hole'),
        socketBoreMm: taggedNumber(raw.D, 'D'),
        socketDepthMm: taggedNumber(raw.E, 'E'),
        socketOdMm: unavailable('F'),
        threadLengthMm: unavailable('G'),
        threadPitchMm: unavailable('H'),
        innerBoreMm: unavailable('I'),
      },
      weights: {
        weightKg: taggedNumber(raw.Kg || raw.KG, 'Kg'),
      }
    });
  }).filter(Boolean);
}

export function makeOletRow(data) {
  const base = {
    componentType: 'OLET',
    oletType: data.oletType,
    nps: data.nps,
    dn: data.dn,
    scheduleOrRating: data.scheduleOrRating,
    source: data.source,
    sourceRowNumber: data.sourceRowNumber,
    datasetVersion: 'pipedata-db/2026.06.dbphase78',
    dimensions: data.dimensions,
    weights: data.weights,
  };
  
  const allDimsNull = Object.values(base.dimensions).every(d => d.value === null);
  if (allDimsNull) return null;

  base.id = oletCatalogKey(base);
  
  const hasDim = base.dimensions.heightAMm.value !== null;
  const hasWeight = base.weights.weightKg.value !== null;
  base.dataStatus = hasDim && hasWeight ? 'READY' : 'PARTIAL';
  
  base.provenance = {
    standard: 'ASME B16.11 / MSS SP-97',
    source: base.source,
    datasetVersion: base.datasetVersion,
    dataStatus: base.dataStatus,
    sourceRowNumber: base.sourceRowNumber,
  };
  
  return base;
}

function taggedNumber(val, col) {
  const p = numberOrNull(val);
  return p === null ? { value: null, basis: 'UNAVAILABLE', sourceColumn: col }
    : { value: p, basis: 'SOURCE_VALUE', sourceColumn: col, unit: col.toLowerCase().includes('k') ? 'kg' : 'mm' };
}
const unavailable = (col) => ({ value: null, basis: 'UNAVAILABLE', sourceColumn: col });
function clean(val) {
  const t = String(val ?? '').trim();
  return t === '' || /^N\/A|SPA|0(\.0)?$/i.test(t) ? null : t;
}
function numberOrNull(val) {
  const c = clean(val);
  return c !== null && Number.isFinite(Number(c)) ? Number(c) : null;
}
