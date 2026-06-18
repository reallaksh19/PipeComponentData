export function supportKey(row) {
  return `SUPPORT|${row.supportKind}`;
}

export function buildSupportIndex(rows) {
  const byKey = {};
  for (const row of rows) {
    const key = supportKey(row);
    if (byKey[key]) throw new Error(`Duplicate support key: ${key}`);
    byKey[key] = row.id;
  }
  return { schemaVersion: 'pipedata-support-index/v1', byKey };
}

export function lookupSupportRecord(catalog, query) {
  const key = `SUPPORT|${query.supportKind}`;
  const id = catalog.index.byKey[key];
  if (!id) return { ok: false, code: 'SUPPORT_LOOKUP_MISS', query };
  const row = catalog.rows.find((item) => item.id === id);
  return { ok: true, row, matchKey: key, provenance: row.provenance };
}

export function validateSupportRows(rows) {
  const seen = new Set();
  for (const row of rows) {
    const key = supportKey(row);
    if (seen.has(key)) throw new Error(`Duplicate support row: ${key}`);
    seen.add(key);
    assertProvenance(row);
    if (row.componentFamily !== 'SUPPORT') throw new Error(`Invalid support family: ${row.id}`);
    if (row.createsPipeContinuity) throw new Error(`Support cannot create pipe continuity: ${row.id}`);
  }
  return true;
}

function assertProvenance(row) {
  for (const field of ['standard', 'source', 'datasetVersion', 'dataStatus']) {
    if (!row.provenance?.[field]) throw new Error(`Missing provenance ${field}: ${row.id}`);
  }
}
