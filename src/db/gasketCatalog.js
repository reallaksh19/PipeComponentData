export function gasketCatalogKey(row) {
  return [
    'GASKET',
    row.subtype || 'UNKNOWN',
    row.nps || 'UNKNOWN',
    row.classRating || 'UNKNOWN',
    row.facing || 'UNKNOWN',
  ].join('|');
}

export function buildGasketIndex(rows) {
  const index = {};
  const diagnostics = [];
  for (const row of rows) {
    const key = gasketCatalogKey(row);
    if (index[key]) diagnostics.push({ code: 'DUPLICATE_GASKET_KEY', key });
    index[key] = row.id;
  }
  return { index, diagnostics };
}

export function lookupGasketRecord(catalog, query) {
  const key = gasketCatalogKey({
    subtype: query.subtype,
    nps: query.nps,
    classRating: query.classRating,
    facing: query.facing,
  });
  const id = catalog.index[key];
  if (!id) return { ok: false, code: 'GASKET_LOOKUP_MISS', query };
  const row = catalog.rows.find((candidate) => candidate.id === id);
  return row ? { ok: true, row, matchKey: key } : { ok: false, code: 'GASKET_INDEX_STALE', query };
}

export function gasketSourceFolders(folderCatalog) {
  return folderCatalog.folders.filter((folder) => folder.family === 'GASKET');
}

export function validateGasketRows(rows) {
  const diagnostics = [];
  for (const row of rows) {
    for (const field of ['standard', 'source', 'datasetVersion', 'dataStatus']) {
      if (!row[field]) diagnostics.push({ code: 'GASKET_PROVENANCE_MISSING', rowId: row.id, field });
    }
    const values = Object.values(row.dimensions || {});
    if (values.some((entry) => typeof entry.value === 'number')) {
      diagnostics.push({ code: 'GASKET_NUMERIC_DIMENSION_WITHOUT_SOURCE_TABLE', rowId: row.id });
    }
  }
  return diagnostics;
}
