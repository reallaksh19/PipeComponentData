export function pipeScheduleKey(rowOrQuery) {
  return `PIPE|NPS${rowOrQuery.nps}|SCH${rowOrQuery.schedule}`;
}

export function buildPipeScheduleIndex(rows) {
  const byKey = {};
  const readyKeys = [];
  const partialKeys = [];

  rows.forEach((row, index) => {
    const key = pipeScheduleKey(row);
    if (byKey[key] !== undefined) throw new Error(`Duplicate pipe schedule key: ${key}`);
    byKey[key] = index;
    if (row.dataStatus === 'READY') readyKeys.push(key);
    else partialKeys.push(key);
  });

  return { byKey, readyKeys, partialKeys };
}

export function lookupPipeScheduleRecord(dataset, query) {
  const key = pipeScheduleKey(query);
  const index = dataset.index || buildPipeScheduleIndex(dataset.rows || []);
  const rowIndex = index.byKey[key];
  if (rowIndex === undefined) return { ok: false, code: 'PIPE_SCHEDULE_LOOKUP_MISS', query };
  const row = dataset.rows[rowIndex];
  return { ok: true, key, row, provenance: rowProvenance(row) };
}

export function validatePipeScheduleRows(dataset) {
  const errors = [];
  const rows = dataset.rows || [];
  const seen = new Set();

  for (const row of rows) {
    const key = pipeScheduleKey(row);
    if (seen.has(key)) errors.push(`duplicate:${key}`);
    seen.add(key);
    for (const field of ['standard', 'source', 'datasetVersion', 'dataStatus']) {
      if (!row[field]) errors.push(`missing:${field}:${key}`);
    }
    for (const field of numericFields) {
      const value = row[field];
      if (value !== null && typeof value !== 'number') errors.push(`non-numeric:${field}:${key}`);
      if (typeof value === 'number' && !Number.isFinite(value)) errors.push(`invalid:${field}:${key}`);
    }
  }

  return errors;
}

function rowProvenance(row) {
  return {
    standard: row.standard,
    source: row.source,
    datasetVersion: row.datasetVersion,
    dataStatus: row.dataStatus,
  };
}

const numericFields = Object.freeze([
  'dn',
  'odMm',
  'wallMm',
  'halfOdMm',
  'idMm',
  'weightKgPerM',
  'weightWithWaterKgPerM',
  'momentOfInertiaSource',
]);
