import { createSearchChips } from './chips.js';
import { parseEngineeringSearch } from './parser.js';
import { rowMatchesFilters, scoreRow } from './score.js';

export function applySearchToRows(query, rows, options = {}) {
  const parsed = parseEngineeringSearch(query);
  const strict = rows
    .filter((row) => rowMatchesFilters(row, parsed.filters))
    .map((row) => ({ row, score: scoreRow(row, parsed.filters), matchType: 'structured' }))
    .sort((a, b) => b.score - a.score || String(a.row.id).localeCompare(String(b.row.id)));

  const results = strict.length || options.disableFallback ? strict : fuzzyFallback(query, rows);
  return { parsed, chips: createSearchChips(parsed), results, rows: results.map((item) => item.row) };
}

function fuzzyFallback(query, rows) {
  const needles = String(query ?? '').toUpperCase().split(/\s+/).filter(Boolean);
  if (!needles.length) return [];
  return rows
    .map((row) => ({ row, score: textScore(row, needles), matchType: 'fuzzy' }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}

function textScore(row, needles) {
  const haystack = [
    row.id, row.componentType, row.valveType, row.flangeType, row.fittingType,
    row.endType, row.facing, row.nps, row.dn, row.classRating, row.schedule,
  ].join(' ').toUpperCase();
  return needles.reduce((score, token) => score + (haystack.includes(token) ? 10 : 0), 0);
}

export { createSearchChips, parseEngineeringSearch };
