const SLOT_BINDING_VERSION = 'PipeToolsSvgSlotBinding.v1';
const SLOT_BINDING_STRATEGY = 'populate-native-svg-text';
const DEFAULT_TIMEOUT_MS = 1500;
const SLOT_BASE_URL = './symbols/dxf/slots/';

export const SVG_SLOT_FORMATS = new Set([
  'diameter-mm',
  'mm',
  'kg',
  'kg-per-m',
  'count',
  'text',
]);

const cache = new Map();

export function clearSvgSlotBindingCache() {
  cache.clear();
}

export function getCachedSvgSlotBinding(sourceCode) {
  const key = normalizeSourceCode(sourceCode);
  if (!key) return null;
  const entry = cache.get(key);
  return entry && Object.hasOwn(entry, 'binding') ? entry.binding : null;
}

export async function loadSvgSlotBinding(sourceCode, options = {}) {
  const key = normalizeSourceCode(sourceCode);
  if (!key) return null;

  const cached = cache.get(key);
  if (cached) {
    if (Object.hasOwn(cached, 'binding')) return cached.binding;
    if (cached.promise) return cached.promise;
  }

  const promise = loadBindingUnchecked(key, options)
    .then((binding) => {
      cache.set(key, { binding });
      return binding;
    })
    .catch((error) => {
      if (options.log !== false) console.warn?.(`[PipeTools] SVG slot binding lookup failed for ${key}: ${error.message || error}`);
      cache.set(key, { binding: null });
      return null;
    });

  cache.set(key, { promise });
  return promise;
}

export function normalizeSvgSlotBinding(rawBinding) {
  const result = validateSvgSlotBinding(rawBinding);
  return result.ok ? result.binding : null;
}

export function validateSvgSlotBinding(rawBinding, options = {}) {
  const errors = [];
  const binding = normalizeBindingObject(rawBinding, errors);
  const expected = normalizeSourceCode(options.expectedSourceCode);
  if (binding && expected && binding.sourceCode !== expected) {
    errors.push(`sourceCode ${binding.sourceCode} does not match expected ${expected}`);
  }
  return { ok: errors.length === 0, binding: errors.length === 0 ? binding : null, errors };
}

async function loadBindingUnchecked(sourceCode, options) {
  const url = options.url || `${options.baseUrl || SLOT_BASE_URL}${encodeURIComponent(sourceCode)}.json`;
  const response = await fetchWithTimeout(url, options.timeoutMs ?? DEFAULT_TIMEOUT_MS, options.fetchOptions);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const rawBinding = await response.json();
  const validation = validateSvgSlotBinding(rawBinding, { expectedSourceCode: sourceCode });
  if (!validation.ok) {
    if (options.log !== false) console.warn?.(`[PipeTools] Invalid SVG slot binding ${sourceCode}: ${validation.errors.join('; ')}`);
    return null;
  }
  return validation.binding;
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

function normalizeBindingObject(rawBinding, errors) {
  if (!rawBinding || typeof rawBinding !== 'object' || Array.isArray(rawBinding)) {
    errors.push('slot binding root must be an object');
    return null;
  }

  if (rawBinding.version !== SLOT_BINDING_VERSION) errors.push(`version must be ${SLOT_BINDING_VERSION}`);
  const sourceCode = normalizeSourceCode(rawBinding.sourceCode);
  if (!sourceCode) errors.push('sourceCode must be a non-empty symbol code');
  if (rawBinding.strategy !== SLOT_BINDING_STRATEGY) errors.push(`strategy must be ${SLOT_BINDING_STRATEGY}`);

  const rawSlots = rawBinding.slots;
  if (!rawSlots || typeof rawSlots !== 'object' || Array.isArray(rawSlots) || Object.keys(rawSlots).length === 0) {
    errors.push('slots must be a non-empty object');
  }

  const slots = {};
  if (rawSlots && typeof rawSlots === 'object' && !Array.isArray(rawSlots)) {
    for (const [label, rawSlot] of Object.entries(rawSlots)) {
      const cleanLabel = String(label || '').trim();
      if (!cleanLabel) {
        errors.push('slot label must be non-empty');
        continue;
      }
      const slot = normalizeSlotSpec(cleanLabel, rawSlot, errors);
      if (slot) slots[cleanLabel] = slot;
    }
  }

  if (errors.length) return null;
  return {
    version: SLOT_BINDING_VERSION,
    sourceCode,
    strategy: SLOT_BINDING_STRATEGY,
    description: typeof rawBinding.description === 'string' ? rawBinding.description.trim() : '',
    slots,
  };
}

function normalizeSlotSpec(label, rawSlot, errors) {
  if (!rawSlot || typeof rawSlot !== 'object' || Array.isArray(rawSlot)) {
    errors.push(`${label}: slot spec must be an object`);
    return null;
  }

  const labelText = stringList(rawSlot.labelText);
  if (!labelText.length) errors.push(`${label}: labelText must be a non-empty string or string array`);

  const preferredValueKeys = stringList(rawSlot.preferredValueKeys);
  if (!preferredValueKeys.length) errors.push(`${label}: preferredValueKeys must be a non-empty string array`);

  const format = String(rawSlot.format || '').trim();
  if (!SVG_SLOT_FORMATS.has(format)) errors.push(`${label}: unsupported format ${format || '(missing)'}`);

  const placeholderNear = rawSlot.placeholderNear == null ? [] : stringList(rawSlot.placeholderNear);
  if (rawSlot.placeholderNear != null && !placeholderNear.length) errors.push(`${label}: placeholderNear must be a non-empty string or string array when present`);

  const suppressOverlayLabels = rawSlot.suppressOverlayLabels == null ? [] : stringList(rawSlot.suppressOverlayLabels);
  if (rawSlot.suppressOverlayLabels != null && !suppressOverlayLabels.length) errors.push(`${label}: suppressOverlayLabels must be a non-empty string array when present`);

  if (errors.some((error) => error.startsWith(`${label}:`))) return null;
  return { labelText, placeholderNear, preferredValueKeys, format, suppressOverlayLabels };
}

function stringList(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizeSourceCode(sourceCode) {
  const value = String(sourceCode || '').trim();
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : '';
}
