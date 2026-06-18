import { splitCsvRows } from '../sourceParsers/csvCells.js';

export function controlValveKey(row) {
  return [
    'VALVE',
    'CONTROL',
    'FLANGED',
    `NPS${row.nps}`,
    `CL${row.classRating}`,
    row.facing,
  ].join('|');
}

export function parseControlValveTable(text, options = {}) {
  const rows = splitCsvRows(text);
  const headers = rows[1] ?? [];
  return rows.slice(2).map((cells, index) => {
    const raw = Object.fromEntries(headers.map((header, columnIndex) => [header.trim(), clean(cells[columnIndex])]));
    return makeControlValveRow(raw, {
      ...options,
      sourceRowNumber: index + 3,
      sourceColumns: headers.length,
    });
  });
}

function makeControlValveRow(raw, options) {
  const classRating = String(options.classRating ?? '150');
  const base = {
    componentType: 'VALVE',
    valveType: 'CONTROL',
    endType: 'FLANGED',
    classRating,
    facing: options.facing ?? 'RF',
    standard: options.standard ?? 'ASME B16.10',
    source: options.source ?? '',
    datasetVersion: options.datasetVersion ?? 'pipedata-db/2026.06.dbphase76',
    dataStatus: 'READY',
  };

  const row = {
    ...base,
    nps: String(raw['Control Valve NB inches']),
    dn: numberOrNull(raw['Control Valve NB mm']),
    sourceRowNumber: options.sourceRowNumber,
    dimensions: {
      faceToFaceRfMm: taggedNumber(raw['RF Face to Face'], 'RF Face to Face'),
      faceToFaceRtjMm: taggedNumber(raw['RTJ Face to Face'], 'RTJ Face to Face'),
      heightMm: taggedNumber(raw['Height'], 'Height'),
      diaphragmDiaMm: taggedNumber(raw['Diaphram Diameter'], 'Diaphram Diameter'),
      sideHandwheelStandoutMm: taggedNumber(raw['Side HW Standout'], 'Side HW Standout'),
      sideHandwheelDiaMm: taggedNumber(raw['Side HW Diameter'], 'Side HW Diameter'),
    },
    weights: {
      rfRtjKg: taggedNumber(raw['weight RF/RTJ'], 'weight RF/RTJ'),
      buttWeldKg: taggedNumber(raw['weight BW'], 'weight BW'),
    },
    provenance: {
      standard: base.standard,
      source: base.source,
      datasetVersion: base.datasetVersion,
      dataStatus: 'READY',
      sourceRowNumber: options.sourceRowNumber,
    },
  };

  row.id = controlValveKey(row);
  row.dataStatus = hasUnavailable(row) ? 'PARTIAL' : 'READY';
  row.provenance.dataStatus = row.dataStatus;
  return row;
}

function taggedNumber(value, sourceColumn) {
  const parsed = numberOrNull(value);
  return parsed === null
    ? { value: null, basis: 'UNAVAILABLE', sourceColumn }
    : { value: parsed, basis: 'SOURCE_VALUE', sourceColumn, unit: sourceColumn.includes('weight') ? 'kg' : 'mm' };
}

function hasUnavailable(row) {
  const tagged = [...Object.values(row.dimensions), ...Object.values(row.weights)];
  return tagged.some((item) => item.basis === 'UNAVAILABLE');
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text === '' || text === 'N/A' || text === 'SPA' ? null : text;
}

function numberOrNull(value) {
  const cleaned = clean(value);
  if (cleaned === null) return null;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}
