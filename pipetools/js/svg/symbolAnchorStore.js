const ANCHOR_VERSION = 'PipeToolsSymbolAnchor.v1';
const DEFAULT_TIMEOUT_MS = 1500;
const ANCHOR_BASE_URL = './symbols/dxf/anchors/';
const VALID_KINDS = new Set(['diameter', 'leader', 'badge']);

const cache = new Map();

export function clearSymbolAnchorCache() {
  cache.clear();
}

export function getCachedSymbolAnchor(sourceCode) {
  const key = normalizeSourceCode(sourceCode);
  if (!key) return null;
  const entry = cache.get(key);
  return entry && Object.hasOwn(entry, 'anchor') ? entry.anchor : null;
}

export async function loadSymbolAnchor(sourceCode, options = {}) {
  const key = normalizeSourceCode(sourceCode);
  if (!key) return null;

  const cached = cache.get(key);
  if (cached) {
    if (Object.hasOwn(cached, 'anchor')) return cached.anchor;
    if (cached.promise) return cached.promise;
  }

  const promise = loadAnchorUnchecked(key, options)
    .then((anchor) => {
      cache.set(key, { anchor });
      return anchor;
    })
    .catch((error) => {
      if (options.log !== false) console.warn?.(`[PipeTools] DXF symbol anchor lookup failed for ${key}: ${error.message || error}`);
      cache.set(key, { anchor: null });
      return null;
    });

  cache.set(key, { promise });
  return promise;
}

export function normalizeSymbolAnchor(rawAnchor) {
  const result = validateSymbolAnchor(rawAnchor);
  return result.ok ? result.anchor : null;
}

export function validateSymbolAnchor(rawAnchor, options = {}) {
  const errors = [];
  const anchor = normalizeAnchorObject(rawAnchor, errors);
  const expected = normalizeSourceCode(options.expectedSourceCode);
  if (anchor && expected && anchor.sourceCode !== expected) {
    errors.push(`sourceCode ${anchor.sourceCode} does not match expected ${expected}`);
  }
  return { ok: errors.length === 0, anchor: errors.length === 0 ? anchor : null, errors };
}

async function loadAnchorUnchecked(sourceCode, options) {
  const url = options.url || `${options.baseUrl || ANCHOR_BASE_URL}${encodeURIComponent(sourceCode)}.json`;
  const response = await fetchWithTimeout(url, options.timeoutMs ?? DEFAULT_TIMEOUT_MS, options.fetchOptions);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const rawAnchor = await response.json();
  const validation = validateSymbolAnchor(rawAnchor, { expectedSourceCode: sourceCode });
  if (!validation.ok) {
    if (options.log !== false) console.warn?.(`[PipeTools] Invalid DXF symbol anchor ${sourceCode}: ${validation.errors.join('; ')}`);
    return null;
  }
  return validation.anchor;
}

async function fetchWithTimeout(url, timeoutMs, fetchOptions = {}) {
  if (typeof fetch !== 'function') throw new Error('fetch is not available');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));
  try {
    return await fetch(url, { cache: 'no-cache', ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeAnchorObject(rawAnchor, errors) {
  if (!rawAnchor || typeof rawAnchor !== 'object' || Array.isArray(rawAnchor)) {
    errors.push('anchor root must be an object');
    return null;
  }

  if (rawAnchor.version !== ANCHOR_VERSION) errors.push(`version must be ${ANCHOR_VERSION}`);
  const sourceCode = normalizeSourceCode(rawAnchor.sourceCode);
  if (!sourceCode) errors.push('sourceCode must be a non-empty string');

  const viewBox = coordinateArray(rawAnchor.viewBox, 4, 'viewBox', errors);
  if (viewBox && (viewBox[2] <= 0 || viewBox[3] <= 0)) errors.push('viewBox width and height must be positive');

  const rawAnchors = rawAnchor.anchors;
  if (!rawAnchors || typeof rawAnchors !== 'object' || Array.isArray(rawAnchors) || Object.keys(rawAnchors).length === 0) {
    errors.push('anchors must be a non-empty object');
  }

  const anchors = {};
  if (rawAnchors && typeof rawAnchors === 'object' && !Array.isArray(rawAnchors)) {
    for (const [label, rawSpec] of Object.entries(rawAnchors)) {
      const cleanLabel = String(label || '').trim();
      if (!cleanLabel) {
        errors.push('anchor label must be non-empty');
        continue;
      }
      const spec = normalizeAnchorSpec(cleanLabel, rawSpec, errors);
      if (spec) anchors[cleanLabel] = spec;
    }
  }

  if (errors.length) return null;
  return {
    version: ANCHOR_VERSION,
    sourceCode,
    viewBox,
    units: typeof rawAnchor.units === 'string' ? rawAnchor.units.trim() : '',
    description: typeof rawAnchor.description === 'string' ? rawAnchor.description.trim() : '',
    anchors,
  };
}

function normalizeAnchorSpec(label, rawSpec, errors) {
  if (!rawSpec || typeof rawSpec !== 'object' || Array.isArray(rawSpec)) {
    errors.push(`${label}: anchor spec must be an object`);
    return null;
  }
  const kind = String(rawSpec.kind || '').trim();
  if (!VALID_KINDS.has(kind)) {
    errors.push(`${label}: unknown anchor kind ${kind || '(missing)'}`);
    return null;
  }

  const preferredValueKeys = Array.isArray(rawSpec.preferredValueKeys)
    ? rawSpec.preferredValueKeys.map((value) => String(value || '').trim()).filter(Boolean)
    : [];

  if (kind === 'diameter') {
    const p1 = coordinateArray(rawSpec.p1, 2, `${label}.p1`, errors);
    const p2 = coordinateArray(rawSpec.p2, 2, `${label}.p2`, errors);
    const labelAt = coordinateArray(rawSpec.labelAt, 2, `${label}.labelAt`, errors);
    return p1 && p2 && labelAt ? { kind, p1, p2, labelAt, preferredValueKeys } : null;
  }

  if (kind === 'leader') {
    const from = coordinateArray(rawSpec.from, 2, `${label}.from`, errors);
    const to = coordinateArray(rawSpec.to, 2, `${label}.to`, errors);
    const labelAt = coordinateArray(rawSpec.labelAt, 2, `${label}.labelAt`, errors);
    return from && to && labelAt ? { kind, from, to, labelAt, preferredValueKeys } : null;
  }

  const labelAt = coordinateArray(rawSpec.labelAt, 2, `${label}.labelAt`, errors);
  return labelAt ? { kind, labelAt, preferredValueKeys } : null;
}

function coordinateArray(value, length, fieldName, errors) {
  if (!Array.isArray(value) || value.length !== length) {
    errors.push(`${fieldName} must be an array of ${length} finite numbers`);
    return null;
  }
  const coords = value.map(Number);
  if (!coords.every(Number.isFinite)) {
    errors.push(`${fieldName} must contain only finite numbers`);
    return null;
  }
  return coords;
}

function normalizeSourceCode(sourceCode) {
  const value = String(sourceCode || '').trim();
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : '';
}
