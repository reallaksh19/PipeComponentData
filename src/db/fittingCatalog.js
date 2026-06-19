import { splitCsvRows } from '../sourceParsers/csvCells.js';

const SUBTYPE_BY_PREFIX = Object.freeze([
  ['90Elbow', 'ELBOW_90'],
  ['45Elbow', 'ELBOW_45'],
  ['StraightTee', 'TEE_STRAIGHT'],
  ['ReducingTee', 'TEE_REDUCING'],
  ['Cap', 'CAP'],
]);

export function fittingKey(row) {
  return ['FITTING', row.subtype, `NPS${row.nps}`, `SCH${row.schedule}`, row.unitSystem ?? 'METRIC'].join('|');
}

export function parseButtweldFittingTable(text, options = {}) {
  const source = options.source ?? '';
  const rows = splitCsvRows(text);
  const header = rows[1] ?? [];
  const meta = inferFittingMeta(source);
  return rows.slice(2).map((raw, index) => makeFittingRow(raw, index + 3, header, meta, source));
}

export function parseReducingTeeTable(text, options = {}) {
  const source = options.source ?? '';
  const rows = splitCsvRows(text);
  const header = rows[1] ?? [];
  const meta = inferFittingMeta(source);
  const parsedRows = [];
  rows.slice(2).forEach((raw, i) => {
    const mainNps = cell(raw, 0);
    if (!mainNps) return;
    const mainDn = number(raw, 1), mainOdMm = number(raw, 2), mainC = number(raw, 3);
    for (let colIdx = 4; colIdx <= 38; colIdx++) {
      const branchNps = header[colIdx];
      const branchM = number(raw, colIdx);
      if (branchM === null || branchM === 0) continue;
      const weightVal = number(raw, colIdx + 39);
      const isReady = mainOdMm !== null && mainC !== null && branchM !== null && weightVal !== null;
      const dataStatus = isReady ? 'READY' : 'PARTIAL';
      const row = {
        id: '',
        componentType: 'FITTING',
        subtype: 'TEE_REDUCING',
        nps: `${mainNps}x${branchNps}`,
        dn: mainDn,
        schedule: meta.schedule,
        unitSystem: meta.unitSystem,
        standard: 'ASME B16.9',
        source,
        datasetVersion: 'pipedata-db/2026.06.dbphase87',
        sourceRowNumber: i + 3,
        dimensions: {
          odMm: mainOdMm !== null ? sourceValue(mainOdMm, 'od') : unavailable('od'),
          centerToEndMm: mainC !== null ? sourceValue(mainC, 'Ctr to End') : unavailable('Ctr to End'),
          branchCenterToEndMm: sourceValue(branchM, `branch Ctr to End [row=${mainNps},col=${branchNps},left-half]`),
        },
        weights: {
          weightKg: weightVal !== null
            ? sourceValue(weightVal, `Approximate Weight KG [row=${mainNps},col=${branchNps},right-half]`)
            : unavailable(`Approximate Weight KG [row=${mainNps},col=${branchNps},right-half]`),
        },
        dataStatus,
        diagnostics: [],
      };
      row.id = fittingKey(row);
      parsedRows.push(row);
    }
  });
  return parsedRows;
}

export function buildFittingIndex(rows) {
  const byKey = {}, readyKeys = [], partialKeys = [];
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
    datasetVersion: 'pipedata-db/2026.06.dbphase87',
    sourceRowNumber,
    diagnostics: [],
  };
  const dimensions = dimensionsFor(base.subtype, raw);
  const weights = { weightKg: taggedNumber(raw, base.subtype === 'CAP' ? 8 : 5) };
  const row = { ...base, dimensions, weights };
  row.dataStatus = [...Object.values(row.dimensions), ...Object.values(row.weights)].some((e) => e.value === null) ? 'PARTIAL' : 'READY';
  row.id = fittingKey(row);
  return row;
}

function dimensionsFor(subtype, raw) {
  if (subtype === 'ELBOW_90' || subtype === 'ELBOW_45') {
    const angle = subtype === 'ELBOW_90' ? 90 : 45;
    const centerToEnd = taggedNumber(raw, 4);
    return {
      odMm: taggedNumber(raw, 2),
      angleDeg: sourceValue(angle, 'derived subtype angle', 'deg'),
      centerToEndMm: centerToEnd,
      developedLengthMm: centerToEnd.value === null
        ? unavailable('centerToEndMm', 'mm')
        : derivedValue(round((Math.PI * centerToEnd.value * angle) / 180), 'arc length from center-to-end', 'mm'),
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

const taggedNumber = (raw, index) => {
  const val = number(raw, index);
  return val === null ? unavailable(`column ${index}`) : sourceValue(val, `column ${index}`);
};
const sourceValue = (value, sourceColumn, unit) => ({ value, basis: 'SOURCE_VALUE', sourceColumn, ...(unit && { unit }) });
const derivedValue = (value, formula, unit) => ({ value, basis: 'DERIVED_VALUE', formula, unit });
const unavailable = (sourceColumn, unit) => ({ value: null, basis: 'UNAVAILABLE', sourceColumn, ...(unit && { unit }) });
const cell = (raw, index) => {
  const v = String(raw[index] ?? '').trim();
  return v === '' || /^(N\/A|N\/N|SPA)$/i.test(v) ? null : v;
};
const number = (raw, index) => {
  const v = cell(raw, index);
  return v !== null && Number.isFinite(Number(v)) ? Number(v) : null;
};
const round = (v, d = 6) => Number(v.toFixed(d));
const rowProvenance = (r) => ({ standard: r.standard, source: r.source, datasetVersion: r.datasetVersion, dataStatus: r.dataStatus });
