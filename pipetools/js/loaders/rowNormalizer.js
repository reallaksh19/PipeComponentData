export function normalizePipeSpecRow(row) {
  const subtype = row.subtype ?? row.valveType ?? row.flangeType ?? row.fittingType
    ?? row.reducerType ?? row.oletType ?? row.supportKind ?? row.type ?? null;
  return {
    ...row,
    componentType: String(row.componentType ?? row.component ?? '').toUpperCase(),
    subtype,
    valveType: row.valveType ?? row.type ?? subtype ?? null,
    type: row.valveType ?? row.type ?? subtype ?? row.componentType,
    nps: row.nps == null ? null : String(row.nps),
    classRating: row.classRating == null ? null : String(row.classRating),
    schedule: row.schedule ?? row.largeSchedule ?? row.scheduleOrRating ?? null,
    dataStatus: row.dataStatus ?? row.status ?? 'PARTIAL',
    svgKey: row.svgKey ?? deriveSvgKey(row),
  };
}

export function normalizeRows(rows = []) {
  return rows.map(normalizePipeSpecRow);
}

export function deriveSvgKey(row) {
  const component = String(row.componentType ?? row.component ?? 'COMPONENT').toUpperCase();
  const type = String(row.valveType ?? row.type ?? row.subtype ?? row.reducerType ?? row.oletType ?? 'GENERIC').toUpperCase();
  const end = String(row.endType ?? row.endConnection ?? 'NA').toUpperCase();
  const facing = String(row.facing ?? 'NA').toUpperCase();
  return [component, type, end, facing].join('_');
}
