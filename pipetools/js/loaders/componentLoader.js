import { buildComponentUrl, getComponentEntry } from './catalogLoader.js';
import { readCache, writeCache } from './cacheStore.js';
import { loadedRows, emptyRows, makeIssue } from './resultState.js';
import { normalizeRows } from './rowNormalizer.js';

export async function loadComponentRows(component, options = {}) {
  const root = options.root ?? '..';
  const entry = getComponentEntry(component);
  if (!entry) return emptyRows(makeIssue('UNKNOWN_COMPONENT', `Unknown component ${component}`));

  const url = buildComponentUrl(root, entry.key);
  const cached = readCache(url);
  if (cached) return cached;

  try {
    const response = await fetch(url);
    if (!response.ok) return emptyRows(makeIssue('LOAD_FAILED', `HTTP ${response.status}`, { url }));
    const payload = await response.json();
    const rows = normalizeRows(payload.rows ?? []);
    return writeCache(url, loadedRows(rows, payload.metadata ?? {}));
  } catch (cause) {
    return emptyRows(makeIssue('LOAD_EXCEPTION', cause.message, { url }));
  }
}
