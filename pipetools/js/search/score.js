export function scoreRow(row, filters) {
  let score = 0;
  score += exact(row.componentType ?? row.component, filters.component, 100);
  score += exact(row.valveType, filters.valveType, 100);
  score += exact(row.flangeType ?? row.type, filters.flangeType, 90);
  score += exact(row.fittingType ?? row.type, filters.fittingType, 90);
  score += exact(row.endType ?? row.endConnection, filters.endType, 60);
  score += exact(row.facing, filters.facing, 50);
  score += exact(String(row.classRating ?? ''), filters.classRating, 70);
  score += exact(String(row.nps ?? ''), filters.nps, 80);
  score += exact(Number(row.dn), filters.dn, 80);
  score += exact(row.schedule, filters.schedule, 40);
  if ((row.dataStatus ?? row.status) === 'READY') score += 10;
  return score;
}

export function rowMatchesFilters(row, filters) {
  return Object.entries(filters).every(([key, value]) => {
    if (value == null || value === '') return true;
    if (key === 'component') return same(row.componentType ?? row.component, value);
    if (key === 'endType') return same(row.endType ?? row.endConnection, value);
    if (key === 'flangeType') return same(row.flangeType ?? row.type, value);
    if (key === 'fittingType') return same(row.fittingType ?? row.type, value);
    if (key === 'nps') return same(String(row.nps ?? ''), String(value));
    if (key === 'dn') return Number(row.dn) === Number(value);
    return same(row[key], value);
  });
}

function exact(actual, expected, points) {
  if (expected == null || expected === '') return 0;
  return same(actual, expected) ? points : 0;
}

function same(actual, expected) {
  return String(actual ?? '').toUpperCase() === String(expected ?? '').toUpperCase();
}
