const LABELS = {
  component: 'Component',
  valveType: 'Valve',
  flangeType: 'Flange',
  fittingType: 'Fitting',
  endType: 'End',
  facing: 'Facing',
  classRating: 'Class',
  nps: 'NPS',
  dn: 'DN',
  schedule: 'Schedule',
};

export function createSearchChips(parsed) {
  return Object.entries(parsed.filters).map(([key, value]) => ({
    key,
    label: LABELS[key] ?? key,
    value: key === 'classRating' ? `CL ${value}` : String(value),
  }));
}
