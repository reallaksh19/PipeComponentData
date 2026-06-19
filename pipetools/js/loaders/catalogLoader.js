export const COMPONENT_CATALOG = Object.freeze([
  {
    key: 'VALVE', label: 'Valves', urls: [
      'data/normalized/valves-expanded.json',
      'data/normalized/valves-globe-expanded.json',
      'data/normalized/valves-control-expanded.json',
      'data/normalized/valves.json',
    ],
  },
  {
    key: 'PIPE', label: 'Pipes', urls: [
      'data/normalized/pipes-expanded.json',
      'data/normalized/pipes.json',
      'data/normalized/pipes-sch80-wave2.json',
      'data/normalized/pipes-sch80-wave3.json',
      'data/normalized/pipes-sch80-wave4.json',
    ],
  },
  {
    key: 'FLANGE', label: 'Flanges', urls: [
      'data/normalized/flanges-expanded.json',
      'data/normalized/flanges.json',
    ],
  },
  { key: 'FITTING', label: 'Fittings', urls: ['data/normalized/fittings.json'] },
  { key: 'GASKET', label: 'Gaskets', urls: ['data/normalized/gaskets.json'] },
  { key: 'SUPPORT', label: 'Supports', urls: ['data/normalized/supports.json'] },
  { key: 'REDUCER', label: 'Reducers', urls: ['data/normalized/reducers-expanded.json'] },
  {
    key: 'OLET', label: 'Olets', urls: [
      'data/normalized/olets-weldolet.json',
      'data/normalized/olets-sockolet.json',
      'data/normalized/olets-thredolet.json',
      'data/normalized/olets-elbolet.json',
    ],
  },
]);

export function getComponentEntry(component) {
  const key = String(component ?? '').toUpperCase();
  return COMPONENT_CATALOG.find((entry) => entry.key === key) ?? null;
}

export function buildComponentUrls(root, component) {
  const entry = getComponentEntry(component);
  if (!entry) return [];
  return (entry.urls ?? [entry.url]).filter(Boolean).map((url) => `${root}/${url}`);
}

export function buildComponentUrl(root, component) {
  return buildComponentUrls(root, component)[0] ?? null;
}
