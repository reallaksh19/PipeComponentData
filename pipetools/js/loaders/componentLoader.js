import { buildComponentUrls, getComponentEntry } from './catalogLoader.js';
import { readCache, writeCache } from './cacheStore.js';
import { loadedRows, emptyRows, makeIssue } from './resultState.js';
import { normalizeRows } from './rowNormalizer.js';

export async function loadComponentRows(component, options = {}) {
  const root = options.root ?? '..';
  const entry = getComponentEntry(component);
  if (!entry) return emptyRows(makeIssue('UNKNOWN_COMPONENT', `Unknown component ${component}`));

  const urls = buildComponentUrls(root, entry.key);
  const cacheKey = urls.join('|');
  const cached = readCache(cacheKey);
  if (cached) return cached;

  try {
    const loaded = await Promise.all(urls.map((url) => fetchPayload(url)));
    const failed = loaded.find((item) => item.issue);
    if (failed) return emptyRows(failed.issue);
    const rows = normalizeRows(dedupeRows(loaded.flatMap((item) => item.rows)));
    const metadata = { sources: loaded.map((item) => item.url), sourceCount: loaded.length };
    return writeCache(cacheKey, loadedRows(rows, metadata));
  } catch (cause) {
    return emptyRows(makeIssue('LOAD_EXCEPTION', cause.message, { urls }));
  }
}

async function fetchPayload(url) {
  const response = await fetch(url);
  if (!response.ok) return { url, issue: makeIssue('LOAD_FAILED', `HTTP ${response.status}`, { url }) };
  const payload = await response.json();
  return { url, rows: payload.rows ?? [], metadata: payload.metadata ?? payload.summary ?? {} };
}

function dedupeRows(rows) {
  const seen = new Map();
  for (const row of rows) {
    const id = row.id ?? JSON.stringify(row);
    if (!seen.has(id)) seen.set(id, row);
  }
  return [...seen.values()];
}
