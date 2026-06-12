export const SEARCH_MODE = Object.freeze({ EXACT_ALIAS_ONLY: 'EXACT_ALIAS_ONLY' });

export function normalizeSearchText(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[”″]/g, '"')
    .replace(/[^A-Z0-9+".]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchTokens(value) {
  return normalizeSearchText(value).split(' ').filter(Boolean);
}

export function expandQueryAliases(query, aliasRows = []) {
  const terms = new Set(searchTokens(query));
  const normalized = normalizeSearchText(query);
  for (const row of aliasRows) {
    const aliases = [row.canonical, ...(row.aliases ?? [])];
    if (aliases.some((alias) => normalized.includes(normalizeSearchText(alias)))) {
      for (const alias of aliases) searchTokens(alias).forEach((term) => terms.add(term));
      searchTokens(row.canonical).forEach((term) => terms.add(term));
    }
  }
  return [...terms];
}

export function componentSearch(query, index, options = {}) {
  const mode = options.mode ?? SEARCH_MODE.EXACT_ALIAS_ONLY;
  if (mode !== SEARCH_MODE.EXACT_ALIAS_ONLY) return rejectedMode(mode);
  const entries = Array.isArray(index?.entries) ? index.entries : [];
  const terms = expandQueryAliases(query, options.aliases ?? []);
  const filters = options.filters ?? {};
  const results = entries
    .filter((entry) => matchesFilters(entry, filters))
    .map((entry) => scoreEntry(entry, terms))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return {
    ok: results.length > 0,
    mode,
    results,
    diagnostics: results.length ? [] : [{ code: 'SEARCH_NO_EXACT_MATCH' }],
  };
}

export function matchesFilters(entry, filters) {
  return Object.entries(filters).every(([key, expected]) => {
    if (expected === undefined || expected === null || expected === '') return true;
    const actual = entry.filters?.[key] ?? entry[key];
    return normalizeSearchText(actual) === normalizeSearchText(expected);
  });
}

function scoreEntry(entry, terms) {
  const haystack = searchTokens([
    entry.id,
    entry.family,
    entry.componentType,
    entry.subtype,
    entry.description,
    ...(entry.aliases ?? []),
  ].join(' '));
  const matched = terms.filter((term) => haystack.includes(term));
  return { id: entry.id, score: matched.length, matched, entry };
}

function rejectedMode(mode) {
  return {
    ok: false,
    mode,
    results: [],
    diagnostics: [{ code: 'SEARCH_MODE_NOT_ALLOWED', mode }],
  };
}
