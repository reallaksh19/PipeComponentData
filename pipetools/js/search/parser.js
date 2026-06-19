import { findCanonical } from './aliases.js';
import { applyInferenceRules } from './inference.js';
import { normalizeQuery, tokenizeQuery } from './normalize.js';

const CLASS_VALUES = new Set(['150', '300', '600', '900', '1500', '2500']);

export function parseEngineeringSearch(query) {
  const normalized = normalizeQuery(query);
  const tokens = tokenizeQuery(query);
  let parsed = {
    raw: String(query ?? ''),
    normalized,
    filters: {},
    tokens,
    warnings: [],
    unmatched: [],
  };

  assignAliasFilters(parsed);
  assignNumericFilters(parsed, tokens, normalized);
  parsed = applyInferenceRules(parsed);
  parsed.unmatched = collectUnmatched(tokens, parsed.filters);
  return parsed;
}

function assignAliasFilters(parsed) {
  for (const field of ['component', 'valveType', 'flangeType', 'fittingType', 'endType', 'facing', 'classRating', 'schedule']) {
    const value = findCanonical(field, parsed.normalized);
    if (value) parsed.filters[field] = value;
  }
  if (parsed.filters.component === 'FLANGE' && !parsed.filters.flangeType) {
    const value = findCanonical('flangeType', parsed.normalized);
    if (value) parsed.filters.flangeType = value;
  }
}

function assignNumericFilters(parsed, tokens, normalized) {
  const dn = normalized.match(/\bDN\s*(\d+)\b/);
  if (dn) parsed.filters.dn = Number(dn[1]);

  const explicitNps = normalized.match(/\bNPS\s*(\d+(?:\.\d+)?)\b/) ||
    normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:"|IN|INCH)/);
  if (explicitNps) parsed.filters.nps = explicitNps[1];

  const cls = normalized.match(/\b(?:CL|CLASS)\s*(150|300|600|900|1500|2500)\b/) ||
    normalized.match(/\b(150|300|600|900|1500|2500)\s*(?:#|LB)\b/);
  if (cls) parsed.filters.classRating = cls[1];

  if (!parsed.filters.nps) {
    const size = tokens.find((token) => /^\d+(?:\.\d+)?$/.test(token) && !CLASS_VALUES.has(token));
    if (size) parsed.filters.nps = size;
  }
}

function collectUnmatched(tokens, filters) {
  const used = new Set(Object.values(filters).map(String));
  return tokens.filter((token) => !used.has(token) && !CLASS_VALUES.has(token) && !/^DN\d+$/.test(token));
}
