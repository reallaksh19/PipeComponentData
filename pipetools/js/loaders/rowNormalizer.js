export function normalizePipeSpecRow(row) {
  return {
    ...row,
    componentType: String(row.componentType ?? row.component ?? '').toUpperCase(),
    valveType: row.valveType ?? row.type ?? row.subtype ?? null,
    type: row.valveType ?? row.type ?? row.subtype ?? row.componentType,
    nps: row.nps == null ? null : String(row.nps),
    classRating: row.classRating == null ? null : String(row.classRating),
    dataStatus: row.dataStatus ?? row.status ?? 'PARTIAL',
    svgKey: row.svgKey ?? deriveSvgKey(row),
  };
}

export function normalizeRows(rows = []) {
  return rows.map(normalizePipeSpecRow);
}

export function deriveSvgKey(row) {
  const component = String(row.componentType ?? row.component ?? 'COMPONENT').toUpperCase();
  const type = String(row.valveType ?? row.type ?? row.subtype ?? 'GENERIC').toUpperCase();
  const end = String(row.endType ?? row.endConnection ?? 'NA').toUpperCase();
  const facing = String(row.facing ?? 'NA').toUpperCase();
  return [component, type, end, facing].join('_');
}
