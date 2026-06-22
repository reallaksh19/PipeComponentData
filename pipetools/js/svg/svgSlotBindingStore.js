export const SLOT_BINDING_VERSION = 'PipeToolsSvgSlotBinding.v2';
export const SLOT_BINDING_STRATEGY = 'populate-native-svg-text';
export const SLOT_COORDINATE_SPACE = 'source-svg-viewBox';

const DEFAULT_TIMEOUT_MS = 1500;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;
const SLOT_BASE_URL = './symbols/dxf/slots/';
const ARTIFACT_WHEN = new Set(['populated', 'missing', 'always']);
const ARTIFACT_TAGS = new Set(['path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'text', 'tspan']);

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
  const nativeTextStyle = normalizeTextStyle(rawBinding.nativeTextStyle);
  return {
    version: SLOT_BINDING_VERSION,
    sourceCode,
    strategy: SLOT_BINDING_STRATEGY,
    coordinateSpace: SLOT_COORDINATE_SPACE,
    confidenceThreshold,
    ...(nativeTextStyle !== undefined ? { nativeTextStyle } : {}),
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
  const purpose = typeof rawSlot.purpose === 'string' && rawSlot.purpose.trim() ? rawSlot.purpose.trim() : '';
  const nativeTextStyle = normalizeTextStyle(rawSlot.nativeTextStyle);
  return {
    semanticLabel,
    displayLabel,
    ...(purpose ? { purpose } : {}),
    labelText,
    preferredValueKeys,
    format,
    target,
    suppressOverlayLabels,
    ...(nativeTextStyle !== undefined ? { nativeTextStyle } : {}),
  };
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

  const cleanupBox = rawTarget.cleanupBox == null ? null : normalizeBox(rawTarget.cleanupBox);
  if (rawTarget.cleanupBox != null && !cleanupBox) errors.push(`${label}: target.cleanupBox must be [minX,minY,maxX,maxY] finite numbers with min < max`);

  const geometryBox = rawTarget.geometryBox == null ? null : normalizeBox(rawTarget.geometryBox);
  if (rawTarget.geometryBox != null && !geometryBox) errors.push(`${label}: target.geometryBox must be [minX,minY,maxX,maxY] finite numbers with min < max`);

  const placeholderText = rawTarget.placeholderText == null ? [] : stringList(rawTarget.placeholderText);
  if (rawTarget.placeholderText != null && !placeholderText.length) errors.push(`${label}: target.placeholderText must be a non-empty string array when present`);

  const cleanupPlaceholderText = rawTarget.cleanupPlaceholderText == null ? [] : stringList(rawTarget.cleanupPlaceholderText);
  if (rawTarget.cleanupPlaceholderText != null && !cleanupPlaceholderText.length) errors.push(`${label}: target.cleanupPlaceholderText must be a non-empty string array when present`);

  const allowedExistingText = rawTarget.allowedExistingText == null ? [] : stringList(rawTarget.allowedExistingText);
  if (rawTarget.allowedExistingText != null && !allowedExistingText.length) errors.push(`${label}: target.allowedExistingText must be a non-empty string array when present`);

  const unitTextNearby = rawTarget.unitTextNearby == null ? [] : stringList(rawTarget.unitTextNearby);
  if (rawTarget.unitTextNearby != null && !unitTextNearby.length) errors.push(`${label}: target.unitTextNearby must be a non-empty string array when present`);

  const maxDistanceFromLabel = rawTarget.maxDistanceFromLabel == null ? null : Number(rawTarget.maxDistanceFromLabel);
  if (rawTarget.maxDistanceFromLabel != null && (!Number.isFinite(maxDistanceFromLabel) || maxDistanceFromLabel <= 0)) {
    errors.push(`${label}: target.maxDistanceFromLabel must be a positive finite number when present`);
  }

  if (rawTarget.cleanupPlaceholders != null && typeof rawTarget.cleanupPlaceholders !== 'boolean') {
    errors.push(`${label}: target.cleanupPlaceholders must be boolean when present`);
  }

  if (rawTarget.hideGeometryWhenMissing != null && typeof rawTarget.hideGeometryWhenMissing !== 'boolean') {
    errors.push(`${label}: target.hideGeometryWhenMissing must be boolean when present`);
  }

  if (rawTarget.hideGeometryWhenMissing === true && !geometryBox) {
    errors.push(`${label}: target.geometryBox is required when hideGeometryWhenMissing is true`);
  }

  const artifactBoxes = rawTarget.artifactBoxes == null ? [] : normalizeArtifactBoxes(label, rawTarget.artifactBoxes, errors);

  return {
    targetBox,
    ...(labelBox ? { labelBox } : {}),
    ...(cleanupBox ? { cleanupBox } : {}),
    ...(geometryBox ? { geometryBox } : {}),
    placeholderText,
    cleanupPlaceholderText,
    allowedExistingText,
    unitTextNearby,
    ...(rawTarget.cleanupPlaceholders != null ? { cleanupPlaceholders: rawTarget.cleanupPlaceholders } : {}),
    ...(rawTarget.hideGeometryWhenMissing != null ? { hideGeometryWhenMissing: rawTarget.hideGeometryWhenMissing } : {}),
    ...(artifactBoxes.length ? { artifactBoxes } : {}),
    maxDistanceFromLabel,
    expectedPosition: typeof rawTarget.expectedPosition === 'string' ? rawTarget.expectedPosition.trim() : '',
    replaceMode: typeof rawTarget.replaceMode === 'string' ? rawTarget.replaceMode.trim() : 'textContent',
  };
}

function normalizeArtifactBoxes(label, rawArtifactBoxes, errors) {
  if (!Array.isArray(rawArtifactBoxes) || !rawArtifactBoxes.length) {
    errors.push(`${label}: target.artifactBoxes must be a non-empty array when present`);
    return [];
  }
  return rawArtifactBoxes.map((artifact, index) => normalizeArtifactBox(label, artifact, index, errors)).filter(Boolean);
}

function normalizeArtifactBox(label, artifact, index, errors) {
  const prefix = `${label}: target.artifactBoxes[${index}]`;
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
    errors.push(`${prefix} must be an object`);
    return null;
  }
  const box = normalizeBox(artifact.box);
  if (!box) errors.push(`${prefix}.box must be [minX,minY,maxX,maxY] finite numbers with min < max`);
  const when = String(artifact.when || 'populated').trim().toLowerCase();
  if (!ARTIFACT_WHEN.has(when)) errors.push(`${prefix}.when must be one of ${[...ARTIFACT_WHEN].join(', ')}`);
  const tags = artifact.tags == null ? [] : stringList(artifact.tags).map((tag) => tag.toLowerCase());
  if (artifact.tags != null && !tags.length) errors.push(`${prefix}.tags must be a non-empty string array when present`);
  tags.forEach((tag) => { if (!ARTIFACT_TAGS.has(tag)) errors.push(`${prefix}.tags contains unsupported tag ${tag}`); });
  const strokeColors = artifact.strokeColors == null ? [] : stringList(artifact.strokeColors);
  if (artifact.strokeColors != null && !strokeColors.length) errors.push(`${prefix}.strokeColors must be a non-empty string array when present`);
  const maxWidth = artifact.maxWidth == null ? null : Number(artifact.maxWidth);
  if (artifact.maxWidth != null && (!Number.isFinite(maxWidth) || maxWidth <= 0)) errors.push(`${prefix}.maxWidth must be a positive finite number`);
  const maxHeight = artifact.maxHeight == null ? null : Number(artifact.maxHeight);
  if (artifact.maxHeight != null && (!Number.isFinite(maxHeight) || maxHeight <= 0)) errors.push(`${prefix}.maxHeight must be a positive finite number`);
  const includeText = artifact.includeText == null ? undefined : artifact.includeText;
  if (includeText !== undefined && typeof includeText !== 'boolean') errors.push(`${prefix}.includeText must be boolean when present`);
  const reason = typeof artifact.reason === 'string' ? artifact.reason.trim() : '';
  if (artifact.reason != null && !reason) errors.push(`${prefix}.reason must be non-empty when present`);
  if (!box) return null;
  return {
    box,
    when,
    ...(includeText !== undefined ? { includeText } : {}),
    ...(tags.length ? { tags } : {}),
    ...(strokeColors.length ? { strokeColors } : {}),
    ...(maxWidth != null && Number.isFinite(maxWidth) ? { maxWidth } : {}),
    ...(maxHeight != null && Number.isFinite(maxHeight) ? { maxHeight } : {}),
    ...(reason ? { reason } : {}),
  };
}

function normalizeTextStyle(value) {
  if (value === false) return false;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => String(key || '').trim() && item != null));
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
