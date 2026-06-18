import { splitCsvRows } from '../sourceParsers/csvCells.js';

const CLASSES = Object.freeze(['2500', '1500', '900', '600', '400', '300', '150']);
const SUBTYPES = Object.freeze(['WN', 'SO', 'BLIND']);

export function parseFlangeCsv(text, sourcePath) {
  const rows = splitCsvRows(text);
  const header = rows[1] ?? [];
  return {
    source: sourcePath,
    classRating: inferFlangeClass(sourcePath),
    columnCount: Number(rows[0]?.[0] ?? header.length),
    header,
    rows: rows.slice(2).map((raw, index) => ({ raw, sourceRow: index + 3 })),
  };
}

export function explodeFlangeRows(parsed) {
  return parsed.rows.flatMap((entry) => SUBTYPES.map((subtype) => makeFlangeRow(parsed, entry, subtype)));
}

export function flangeCatalogKey(rowOrQuery) {
  return `FLANGE|${rowOrQuery.subtype}|NPS${rowOrQuery.nps}|CL${rowOrQuery.classRating}|${rowOrQuery.unitSystem ?? 'METRIC'}`;
}

export function buildFlangeIndex(rows) {
  const byKey = {};
  const readyKeys = [];
  const partialKeys = [];
  rows.forEach((row, index) => {
    const key = flangeCatalogKey(row);
    if (byKey[key] !== undefined) throw new Error(`Duplicate flange key: ${key}`);
    byKey[key] = index;
    (row.dataStatus === 'READY' ? readyKeys : partialKeys).push(key);
  });
  return { byKey, readyKeys, partialKeys };
}

export function lookupFlangeCatalogRecord(dataset, query) {
  const key = flangeCatalogKey(query);
  const index = dataset.index ?? buildFlangeIndex(dataset.rows ?? []);
  const rowIndex = index.byKey[key];
  if (rowIndex === undefined) return { ok: false, code: 'FLANGE_LOOKUP_MISS', query };
  const row = dataset.rows[rowIndex];
  return { ok: true, key, row, provenance: rowProvenance(row) };
}

export function validateFlangeRows(rows) {
  const errors = [];
  const seen = new Set();
  for (const row of rows) {
    const key = flangeCatalogKey(row);
    if (seen.has(key)) errors.push(`duplicate:${key}`);
    seen.add(key);
    for (const field of ['standard', 'source', 'datasetVersion', 'dataStatus']) {
      if (!row[field]) errors.push(`missing:${field}:${key}`);
    }
    if ('boreMm' in row) errors.push(`forbidden-bore:${key}`);
  }
  return errors;
}

function makeFlangeRow(parsed, entry, subtype) {
  const raw = entry.raw;
  const base = {
    componentType: 'FLANGE', subtype, nps: cell(raw, 0), dn: number(raw, 1),
    classRating: parsed.classRating, unitSystem: 'METRIC', standard: 'ASME B16.5',
    source: parsed.source, sourceRow: entry.sourceRow, datasetVersion: 'pipedata-db/2026.06.dbphase6',
    flangeOdMm: number(raw, 2), flangeThicknessMm: number(raw, 3), rfDiaMm: number(raw, 10),
    rfHeightMm: number(raw, 11), rtjRfDiaMm: number(raw, 12), rtjRfHeightMm: number(raw, 13),
    ringNo: cell(raw, 14), pcdMm: number(raw, 18), boltCount: number(raw, 19),
    boltSizeUnc: cell(raw, 20), isoBoltSizeMm: number(raw, 25), ignoredColumnRange: [45, 53],
  };
  const subtypeFields = subtype === 'WN'
    ? { hubXMm: number(raw, 4), weldDiaMm: number(raw, 5), wnLengthMm: number(raw, 8), weightKg: number(raw, 26) }
    : subtype === 'SO'
      ? { hubXMm: number(raw, 4), weldDiaMm: number(raw, 5), soBoreMm: number(raw, 9), weightKg: number(raw, 27) }
      : { hubXMm: null, weldDiaMm: null, blindThicknessMm: number(raw, 34), weightKg: number(raw, 28) };
  const row = { ...base, ...subtypeFields };
  row.id = flangeCatalogKey(row);
  row.valueBasis = Object.fromEntries(numericFields(row).map((key) => [key, row[key] === null ? 'UNAVAILABLE' : 'SOURCE_VALUE']));
  row.dataStatus = row.flangeOdMm !== null && row.weightKg !== null ? 'READY' : 'PARTIAL';
  return row;
}

function numericFields(row) {
  return Object.keys(row).filter((key) => key.endsWith('Mm') || ['dn', 'boltCount', 'isoBoltSizeMm', 'weightKg'].includes(key));
}

function cell(raw, index) {
  const value = String(raw[index] ?? '').trim();
  return value === '' || /^N\/A$/i.test(value) || /^SPA$/i.test(value) ? null : value;
}

function number(raw, index) {
  const value = cell(raw, index);
  if (value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function inferFlangeClass(sourcePath) {
  const stem = String(sourcePath).split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
  return CLASSES.find((rating) => new RegExp(`${rating}(?=\\D|$)`).test(stem)) ?? null;
}

function rowProvenance(row) {
  return { standard: row.standard, source: row.source, datasetVersion: row.datasetVersion, dataStatus: row.dataStatus };
}
