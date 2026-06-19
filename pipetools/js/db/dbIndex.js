const DEFAULT_DB_INDEX_URL = './data/db-index.json';

let cachedIndex = null;

export async function loadDbIndex(options = {}) {
  if (cachedIndex && !options.forceReload) return cachedIndex;
  const url = options.url ?? DEFAULT_DB_INDEX_URL;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`DB index load failed: HTTP ${response.status}`);
  const payload = await response.json();
  cachedIndex = normalizeDbIndex(payload);
  return cachedIndex;
}

export function normalizeDbIndex(payload = {}) {
  const families = Array.isArray(payload.families) ? payload.families.map(normalizeEntry) : [];
  return Object.freeze({
    schema: payload.schema ?? 'pipetools-db-index/v1',
    generatedBy: payload.generatedBy ?? null,
    policy: payload.policy ?? {},
    families: Object.freeze(families),
  });
}

export function getDbFamily(index, family) {
  const key = String(family ?? '').toUpperCase();
  return index?.families?.find((entry) => entry.family === key) ?? null;
}

export function getDbFamilies(index) {
  return index?.families ?? [];
}

export function getSvgSupportedFamilies(index) {
  return getDbFamilies(index).filter((entry) => entry.svgSupported).map((entry) => entry.family);
}

function normalizeEntry(entry = {}) {
  const family = String(entry.family ?? entry.componentType ?? '').toUpperCase();
  const repositoryPaths = Object.freeze((entry.repositoryPaths ?? [entry.repositoryPath]).filter(Boolean));
  const runtimeUrls = Object.freeze((entry.runtimeUrls ?? [entry.runtimeUrl]).filter(Boolean));
  return Object.freeze({
    ...entry,
    family,
    componentType: String(entry.componentType ?? family).toUpperCase(),
    repositoryPaths,
    runtimeUrls,
    repositoryPath: entry.repositoryPath ?? repositoryPaths[0] ?? null,
    runtimeUrl: entry.runtimeUrl ?? runtimeUrls[0] ?? null,
    subtypes: Object.freeze((entry.subtypes ?? []).map((item) => String(item).toUpperCase())),
    keyFields: Object.freeze(entry.keyFields ?? []),
    searchFields: Object.freeze(entry.searchFields ?? []),
    availableFilters: Object.freeze(entry.availableFilters ?? []),
    svgSupported: Boolean(entry.svgSupported),
  });
}
