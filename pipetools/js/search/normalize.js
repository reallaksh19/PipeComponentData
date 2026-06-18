export function normalizeQuery(input) {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[“”]/g, '"')
    .replace(/#/g, '# ')
    .replace(/\//g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeQuery(input) {
  return normalizeQuery(input).split(' ').filter(Boolean);
}
