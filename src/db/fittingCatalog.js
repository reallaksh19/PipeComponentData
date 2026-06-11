import { splitCsvRows } from '../sourceParsers/csvCells.js';

const SUBTYPE_BY_PREFIX = Object.freeze([
  ['90Elbow', 'ELBOW_90'],
  ['45Elbow', 'ELBOW_45'],
  ['StraightTee', 'TEE_STRAIGHT'],
  ['Cap', 'CAP'],
]);

export function fittingKey(row) {
  return [
    'FITTING',
    row.subtype,
    `NPS${row.nps}`,
    `SCH${row.schedule}`,
    row.unitSystem ?? 'METRIC',
  ].join('|');
}

export function parseButtweldFittingTable(text, options = {}) {
  const source = options.source ?? '';
  const rows = splitCsvRows(text);
  const header = rows[1] ?? [];
  const meta = inferFittingMeta(source);
  return rows.slice(2).map((raw, index) => makeFittingRow(raw, index + 3, header, meta, source));
}

export function buildFittingIndex(rows) {
  const byKey = {};
  const readyKeys = [];
  const partialKeys = [];
  for (const row of rows) {
    const key = fittingKey(row);
    if (byKey[key] !== undefined) throw new Error(`Duplicate fitting key: ${key}`);
    byKey[key] = row.id;
    (row.dataStatus === 'READY' ? readyKeys : partialKeys).push(key);
  }
  return { byKey, readyKeys, partialKeys };
}

export function lookupFittingRecord(rows, query) {
  const key = fittingKey(query);
  const row = rows.find((candidate) => candidate.id === key);
  if (!row) return { ok: false, code: 'FITTING_LOOKUP_MISS', query };
  return { ok: true, key, row, provenance: rowProvenance(row) };
}

export function validateFittingRows(rows) {
  const errors = [];
  const seen = new Set();
  for (const row of rows) {
    const key = fittingKey(row);
    if (seen.has(key)) errors.push(`duplicate:${key}`);
    seen.add(key);
    for (const field of ['standard', 'source', 'datasetVersion', 'dataStatus']) {
      if (!row[field]) errors.push(`missing:${field}:${key}`);
    }
  }
  return errors;
}

function makeFittingRow(raw, sourceRowNumber, header, meta, source) {
  const base = {
    id: '',
    componentType: 'FITTING',
    subtype: meta.subtype,
    nps: cell(raw, 0),
    dn: number(raw, 1),
    schedule: meta.schedule,
    unitSystem: meta.unitSystem,
    standard: 'ASME B16.9',
    source,
    datasetVersion: 'pipedata-db/2026.06.dbphase8',
    sourceRowNumber,
    diagnostics: [],
  };
  const dimensions = dimensionsFor(base.subtype, raw, header);
  const weights = { weightKg: taggedNumber(raw, weightIndex(base.subtype)) };
  const row = { ...base, dimensions, weights };
  row.dataStatus = rowStatus(row);
  row.id = fittingKey(row);
  return row;
}

function dimensionsFor(subtype, raw) {
  if (subtype === 'ELBOW_90' || subtype === 'ELBOW_45') {
    const angleDeg = subtype === 'ELBOW_90' ? 90 : 45;
    const centerToEndMm = taggedNumber(raw, 4);
    return {
      odMm: taggedNumber(raw, 2),
      angleDeg: sourceValue(angleDeg, 'derived subtype angle', 'deg'),
      centerToEndMm,
      developedLengthMm: centerToEndMm.value === null
        ? unavailable('centerToEndMm', 'mm')
        : derivedValue(round((Math.PI * centerToEndMm.value * angleDeg) / 180), 'arc length from center-to-end', 'mm'),
    };
  }
  if (subtype === 'TEE_STRAIGHT') {
    return { odMm: taggedNumber(raw, 2), centerToEndMm: taggedNumber(raw, 3), branchCenterToEndMm: taggedNumber(raw, 4) };
  }
  return { odMm: taggedNumber(raw, 2), overCapMm: taggedNumber(raw, 4), overCapE1Mm: taggedNumber(raw, 7) };
}

function inferFittingMeta(source) {
  const file = String(source).split('/').pop() ?? '';
  const [prefix, subtype] = SUBTYPE_BY_PREFIX.find(([key]) => file.startsWith(key)) ?? ['', 'UNKNOWN'];
  const schedule = file.replace(prefix, '').replace(/_Imperial_/, '').replace(/\.[^.]+$/, '') || null;
  return { subtype, schedule, unitSystem: file.includes('_Imperial_') ? 'IMPERIAL' : 'METRIC' };
}

function weightIndex(subtype) {
  return subtype === 'CAP' ? 8 : 5;
}

function rowStatus(row) {
  const values = [...Object.values(row.dimensions), ...Object.values(row.weights)];
  return values.some((entry) => entry.value === null) ? 'PARTIAL' : 'READY';
}

function taggedNumber(raw, index) {
  const value = number(raw, index);
  return value === null ? unavailable(`column ${index}`) : sourceValue(value, `column ${index}`);
}

function sourceValue(value, sourceColumn, unit = undefined) {
  return { value, basis: 'SOURCE_VALUE', sourceColumn, ...(unit ? { unit } : {}) };
}

function derivedValue(value, formula, unit) {
  return { value, basis: 'DERIVED_VALUE', formula, unit };
}

function unavailable(sourceColumn, unit = undefined) {
  return { value: null, basis: 'UNAVAILABLE', sourceColumn, ...(unit ? { unit } : {}) };
}

function cell(raw, index) {
  const value = String(raw[index] ?? '').trim();
  return value === '' || /^N\/A$/i.test(value) || /^N\/N$/i.test(value) || /^SPA$/i.test(value) ? null : value;
}

function number(raw, index) {
  const value = cell(raw, index);
  if (value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value, decimals = 6) {
  return Number(value.toFixed(decimals));
}

function rowProvenance(row) {
  return { standard: row.standard, source: row.source, datasetVersion: row.datasetVersion, dataStatus: row.dataStatus };
}
