const norm = (value) => String(value ?? '').trim().toUpperCase();
const same = (a, b) => norm(a) === norm(b);

export function isFacingApplicable(filters = {}) {
  return !filters.facing || same(filters.endType, 'FLANGED');
}

export function getRowSubtype(row = {}) {
  return row.subtype ?? row.valveType ?? row.flangeType ?? row.fittingType ?? row.supportType ?? row.type ?? null;
}

export function filterPipeSpecRows(rows = [], filters = {}) {
  return rows.filter((row) => rowMatchesFilters(row, filters));
}

export function rowMatchesFilters(row = {}, filters = {}) {
  if (filters.component && !same(row.componentType ?? row.component, filters.component)) return false;
  if (filters.subtype && !same(getRowSubtype(row), filters.subtype)) return false;
  if (filters.valveType && !same(row.valveType, filters.valveType)) return false;
  if (filters.flangeType && !same(row.flangeType, filters.flangeType)) return false;
  if (filters.fittingType && !same(row.fittingType, filters.fittingType)) return false;
  if (filters.endType && !same(row.endType ?? row.endConnection, filters.endType)) return false;
  if (filters.facing && !same(row.facing, filters.facing)) return false;
  if (filters.classRating && !same(row.classRating, stripClass(filters.classRating))) return false;
  if (filters.nps && !same(row.nps, filters.nps)) return false;
  if (filters.dn && !same(row.dn, filters.dn)) return false;
  if (filters.schedule && !same(row.schedule, filters.schedule)) return false;
  return true;
}

export function getDashboardCounts(rows = [], filters = {}) {
  return {
    components: countBy(rows, (row) => row.componentType ?? row.component),
    subtypes: countBy(filterPipeSpecRows(rows, withoutKeys(filters, ['subtype', 'valveType'])), getRowSubtype),
    endTypes: countBy(filterPipeSpecRows(rows, withoutKeys(filters, ['endType'])), (row) => row.endType ?? row.endConnection),
    facings: countBy(filterPipeSpecRows(rows, withoutKeys(filters, ['facing'])), (row) => row.facing),
    classes: countBy(filterPipeSpecRows(rows, withoutKeys(filters, ['classRating'])), (row) => row.classRating),
    sizes: countBy(filterPipeSpecRows(rows, withoutKeys(filters, ['nps'])), (row) => row.nps),
  };
}

export function getSelectedPipeSpecRow(rows = [], selectedRowId) {
  return rows.find((row) => row.id === selectedRowId) ?? null;
}

export function toDashboardFilterPatch(filters = {}) {
  const subtype = filters.subtype ?? filters.valveType ?? filters.flangeType ?? filters.fittingType ?? null;
  return {
    component: filters.component ?? null,
    subtype,
    endType: filters.endType ?? filters.endConnection ?? null,
    facing: filters.facing ?? null,
    classRating: filters.classRating ? stripClass(filters.classRating) : null,
    nps: filters.nps == null ? null : String(filters.nps),
    dn: filters.dn ?? null,
    schedule: filters.schedule ?? null,
  };
}

function stripClass(value) {
  return String(value ?? '').toUpperCase().replace(/^CL\s*/, '');
}

function withoutKeys(source, keys) {
  const next = { ...source };
  for (const key of keys) delete next[key];
  return next;
}

function countBy(rows, getter) {
  return rows.reduce((acc, row) => {
    const key = getter(row);
    if (key != null && key !== '') acc[String(key)] = (acc[String(key)] ?? 0) + 1;
    return acc;
  }, {});
}
