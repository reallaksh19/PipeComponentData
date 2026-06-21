export const COMPONENT_CATALOG = Object.freeze([
  {
    key: 'VALVE', label: 'Valves', urls: [
      'data/normalized/valves-control-expanded.json',
      'data/normalized/valves-expanded.json',
      'data/normalized/valves-globe-expanded.json',
      'data/normalized/valves.json',
    ],
  },
  {
    key: 'PIPE', label: 'Pipes', urls: [
      'data/normalized/pipes-expanded.json',
      'data/normalized/pipes-sch80-wave2.json',
      'data/normalized/pipes-sch80-wave3.json',
      'data/normalized/pipes-sch80-wave4.json',
      'data/normalized/pipes.json',
    ],
  },
  {
    key: 'FLANGE', label: 'Flanges', urls: [
      'data/normalized/flanges-cl1500-expanded.json',
      'data/normalized/flanges-cl2500-expanded.json',
      'data/normalized/flanges-cl400-expanded.json',
      'data/normalized/flanges-cl600-wave2.json',
      'data/normalized/flanges-cl600-wave3.json',
      'data/normalized/flanges-cl900-expanded.json',
      'data/normalized/flanges-expanded.json',
      'data/normalized/flanges.json',
    ],
  },
  { key: 'FITTING', label: 'Fittings', urls: ['data/normalized/fittings.json'] },
  { key: 'GASKET', label: 'Gaskets', urls: ['data/normalized/gaskets.json'] },
  { key: 'SUPPORT', label: 'Supports', urls: ['data/normalized/supports.json'] },
  {
    key: 'REDUCER', label: 'Reducers', urls: [
      'data/normalized/reducers-expanded.json',
      'data/normalized/reducers-sch80-wave1.json',
      'data/normalized/reducers-sch80-wave2.json',
    ],
  },
  {
    key: 'OLET', label: 'Olets', urls: [
      'data/normalized/olets-elbolet.json',
      'data/normalized/olets-sockolet.json',
      'data/normalized/olets-thredolet.json',
      'data/normalized/olets-weldolet.json',
    ],
  },
]);

export function getComponentEntry(component, dbIndex = null) {
  const key = String(component ?? '').toUpperCase();
  const indexEntry = dbIndex?.families?.find?.((entry) => entry.family === key || entry.componentType === key);
  if (indexEntry) {
    return {
      key: indexEntry.family,
      label: indexEntry.label,
      urls: [...(indexEntry.runtimeUrls ?? indexEntry.repositoryPaths ?? [])],
      source: 'db-index',
    };
  }
  return COMPONENT_CATALOG.find((entry) => entry.key === key) ?? null;
}

export function buildComponentUrls(root, component, dbIndex = null) {
  const entry = getComponentEntry(component, dbIndex);
  if (!entry) return [];
  return (entry.urls ?? [entry.url]).filter(Boolean).map((url) => resolveUrl(root, url));
}

export function buildComponentUrl(root, component, dbIndex = null) {
  return buildComponentUrls(root, component, dbIndex)[0] ?? null;
}

function resolveUrl(root, url) {
  const text = String(url ?? '');
  if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('//') || text.startsWith('../') || text.startsWith('./') || text.startsWith('/')) return text;
  return `${root}/${text}`;
}
