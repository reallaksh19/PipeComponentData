export const COMPONENT_CATALOG = Object.freeze([
  { key: 'VALVE', label: 'Valves', url: 'data/normalized/valves.json' },
  { key: 'PIPE', label: 'Pipes', url: 'data/normalized/pipes.json' },
  { key: 'FLANGE', label: 'Flanges', url: 'data/normalized/flanges.json' },
  { key: 'FITTING', label: 'Fittings', url: 'data/normalized/fittings.json' },
  { key: 'GASKET', label: 'Gaskets', url: 'data/normalized/gaskets.json' },
  { key: 'SUPPORT', label: 'Supports', url: 'data/normalized/supports.json' },
]);

export function getComponentEntry(component) {
  const key = String(component ?? '').toUpperCase();
  return COMPONENT_CATALOG.find((entry) => entry.key === key) ?? null;
}

export function buildComponentUrl(root, component) {
  const entry = getComponentEntry(component);
  if (!entry) return null;
  return `${root}/${entry.url}`;
}
