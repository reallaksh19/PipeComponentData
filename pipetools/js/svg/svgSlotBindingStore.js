export const SLOT_BINDING_VERSION = 'PipeToolsSvgSlotBinding.v2';
export const SLOT_BINDING_STRATEGY = 'populate-native-svg-text';
export const SLOT_COORDINATE_SPACE = 'source-svg-viewBox';

const DEFAULT_TIMEOUT_MS = 1500;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;
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
  if (rawBinding.coordinateSpace !== SLOT_COORDINATE_SPACE) errors.push(`coordinateSpace must be ${SLOT_COORDINATE_SPACE}`);

  const confidenceThreshold = normalizeConfidence(rawBinding.confidenceThreshold, errors);
  const rawSlots = rawBinding.slots;
  if (!rawSlots || typeof rawSlots !== 'object' || Array.isArray(rawSlots) || Object.keys(rawSlots).length === 0) {
    errors.push('slots must be a non-empty object');
  }

  const slots = {};
  const seenSemantic = new Set();
  if (rawSlots && typeof rawSlots === 'object' && !Array.isArray(rawSlots)) {
    for (const [label, rawSlot] of Object.entries(rawSlots)) {
      const cleanLabel = String(label || '').trim();
      if (!cleanLabel) {
        errors.push('slot label must be non-empty');
        continue;
      }
      const slot = normalizeSlotSpec(cleanLabel, rawSlot, errors);
      const semantic = String(slot?.semanticLabel || cleanLabel).trim();
      if (semantic) {
        const key = normalizedKey(semantic);
        if (seenSemantic.has(key)) errors.push(`${cleanLabel}: duplicate semantic label ${semantic}`);
        seenSemantic.add(key);
      }
      if (slot) slots[cleanLabel] = slot;
    }
  }

  if (errors.length) return null;
  return {
    version: SLOT_BINDING_VERSION,
    sourceCode,
    strategy: SLOT_BINDING_STRATEGY,
    coordinateSpace: SLOT_COORDINATE_SPACE,
    confidenceThreshold,
    description: typeof rawBinding.description === 'string' ? rawBinding.description.trim() : '',
    slots,
  };
}

function normalizeSlotSpec(label, rawSlot, errors) {
  if (!rawSlot || typeof rawSlot !== 'object' || Array.isArray(rawSlot)) {
    errors.push(`${label}: slot spec must be an object`);
    return null;
  }

  const semanticLabel = String(rawSlot.semanticLabel || label).trim();
  if (!semanticLabel) errors.push(`${label}: semanticLabel must be a non-empty string when present`);

  const displayLabel = String(rawSlot.displayLabel || semanticLabel || label).trim();
  const labelText = stringList(rawSlot.labelText);
  if (!labelText.length) errors.push(`${label}: labelText must be a non-empty string or string array`);

  const preferredValueKeys = stringList(rawSlot.preferredValueKeys);
  if (!preferredValueKeys.length) errors.push(`${label}: preferredValueKeys must be a non-empty string array`);

  const format = String(rawSlot.format || '').trim();
  if (!SVG_SLOT_FORMATS.has(format)) errors.push(`${label}: unsupported format ${format || '(missing)'}`);

  const target = normalizeTargetSpec(label, rawSlot.target, errors);
  const suppressOverlayLabels = rawSlot.suppressOverlayLabels == null ? [] : stringList(rawSlot.suppressOverlayLabels);
  if (rawSlot.suppressOverlayLabels != null && !Array.isArray(rawSlot.suppressOverlayLabels)) errors.push(`${label}: suppressOverlayLabels must be a string array when present`);

  if (errors.some((error) => error.startsWith(`${label}:`))) return null;
  return { semanticLabel, displayLabel, labelText, preferredValueKeys, format, target, suppressOverlayLabels };
}

function normalizeTargetSpec(label, rawTarget, errors) {
  if (!rawTarget || typeof rawTarget !== 'object' || Array.isArray(rawTarget)) {
    errors.push(`${label}: target must be an object`);
    return null;
  }
  const targetBox = normalizeBox(rawTarget.targetBox);
  if (!targetBox) errors.push(`${label}: target.targetBox must be [minX,minY,maxX,maxY] finite numbers with min < max`);

  const labelBox = rawTarget.labelBox == null ? null : normalizeBox(rawTarget.labelBox);
  if (rawTarget.labelBox != null && !labelBox) errors.push(`${label}: target.labelBox must be [minX,minY,maxX,maxY] finite numbers with min < max`);

  const placeholderText = rawTarget.placeholderText == null ? [] : stringList(rawTarget.placeholderText);
  if (rawTarget.placeholderText != null && !placeholderText.length) errors.push(`${label}: target.placeholderText must be a non-empty string array when present`);

  const allowedExistingText = rawTarget.allowedExistingText == null ? [] : stringList(rawTarget.allowedExistingText);
  if (rawTarget.allowedExistingText != null && !allowedExistingText.length) errors.push(`${label}: target.allowedExistingText must be a non-empty string array when present`);

  const unitTextNearby = rawTarget.unitTextNearby == null ? [] : stringList(rawTarget.unitTextNearby);
  if (rawTarget.unitTextNearby != null && !unitTextNearby.length) errors.push(`${label}: target.unitTextNearby must be a non-empty string array when present`);

  const maxDistanceFromLabel = rawTarget.maxDistanceFromLabel == null ? null : Number(rawTarget.maxDistanceFromLabel);
  if (rawTarget.maxDistanceFromLabel != null && (!Number.isFinite(maxDistanceFromLabel) || maxDistanceFromLabel <= 0)) {
    errors.push(`${label}: target.maxDistanceFromLabel must be a positive finite number when present`);
  }

  return {
    targetBox,
    labelBox,
    placeholderText,
    allowedExistingText,
    unitTextNearby,
    maxDistanceFromLabel,
    expectedPosition: typeof rawTarget.expectedPosition === 'string' ? rawTarget.expectedPosition.trim() : '',
    replaceMode: typeof rawTarget.replaceMode === 'string' ? rawTarget.replaceMode.trim() : 'textContent',
  };
}

function normalizeConfidence(value, errors) {
  if (value == null) return DEFAULT_CONFIDENCE_THRESHOLD;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 1) {
    errors.push('confidenceThreshold must be > 0 and <= 1 when present');
    return DEFAULT_CONFIDENCE_THRESHOLD;
  }
  return number;
}

function normalizeBox(value) {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const box = value.map(Number);
  if (!box.every(Number.isFinite) || box[0] >= box[2] || box[1] >= box[3]) return null;
  return box;
}

function stringList(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizeSourceCode(sourceCode) {
  const value = String(sourceCode || '').trim();
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : '';
}

function normalizedKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[._\s/\\-]+/g, '');
}
