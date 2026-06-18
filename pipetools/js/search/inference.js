export function applyInferenceRules(parsed) {
  const next = { ...parsed, filters: { ...parsed.filters } };
  if (next.filters.valveType) next.filters.component = 'VALVE';
  if (next.filters.flangeType) next.filters.component = 'FLANGE';
  if (next.filters.fittingType) next.filters.component = 'FITTING';
  if (next.filters.facing && !next.filters.endType) next.filters.endType = 'FLANGED';
  if (next.filters.facing && next.filters.endType !== 'FLANGED') {
    next.warnings = [...next.warnings, 'Facing ignored because end type is not flanged'];
    delete next.filters.facing;
  }
  return next;
}
