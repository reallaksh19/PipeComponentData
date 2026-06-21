#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SLOT_VERSION = 'PipeToolsSvgSlotBinding.v2';
const SLOT_STRATEGY = 'populate-native-svg-text';
const SLOT_COORDINATE_SPACE = 'source-svg-viewBox';
const SUPPORTED_FORMATS = new Set(['diameter-mm', 'mm', 'kg', 'kg-per-m', 'count', 'text']);
const PLACEHOLDER_RE = /^(?:—|–|-|null|undefined)?$/i;
const HARD_CODED_VALUE_RE = /\b\d+(?:\.\d+)?\s*(?:mm|cm|m|kg|kg\/m|kg\s*\/\s*m|cm4|mtr)\b/i;
const DANGEROUS_VALUE_KEYS = new Set(['value', 'displayValue', 'actualValue', 'dbValue', 'dimensionValue', 'weightValue']);
const ARTIFACT_WHEN = new Set(['populated', 'missing', 'always']);
const ARTIFACT_TAGS = new Set(['path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'text', 'tspan']);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const manifestPath = path.join(scriptDir, 'dxf-symbol-manifest.json');
const slotsDir = path.join(scriptDir, 'slots');

const failures = [];
let fileCount = 0;
let slotCount = 0;

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const manifestCodes = new Set((manifest.symbols || []).map((symbol) => symbol.sourceCode));

let entries = [];
try {
  entries = (await readdir(slotsDir)).filter((name) => name.endsWith('.json')).sort();
} catch (error) {
  failures.push(`slots directory missing or unreadable: ${path.relative(repoRoot, slotsDir)} (${error.message})`);
}

for (const fileName of entries) {
  fileCount += 1;
  const filePath = path.join(slotsDir, fileName);
  const text = await readFile(filePath, 'utf8');
  const fileErrors = [];
  let binding;
  try {
    binding = JSON.parse(text);
  } catch (error) {
    failures.push(`${fileName}: invalid JSON: ${error.message}`);
    continue;
  }

  validateBinding(binding, path.basename(fileName, '.json'), fileErrors);
  scanDangerousValues(binding, fileName, fileErrors);
  slotCount += binding?.slots && typeof binding.slots === 'object' && !Array.isArray(binding.slots) ? Object.keys(binding.slots).length : 0;

  if (fileErrors.length) failures.push(...fileErrors.map((error) => `${fileName}: ${error}`));
}

if (failures.length) {
  console.error(`SVG slot binding validation failed: ${failures.length} issue(s)`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`SVG slot binding validation passed: ${fileCount} files, ${slotCount} slots`);

function validateBinding(binding, basename, errors) {
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    errors.push('root must be an object');
    return;
  }
  if (binding.version !== SLOT_VERSION) errors.push(`version must be ${SLOT_VERSION}`);
  if (binding.sourceCode !== basename) errors.push(`sourceCode must match file basename ${basename}`);
  if (!binding.sourceCode || typeof binding.sourceCode !== 'string') errors.push('sourceCode must exist');
  else if (!manifestCodes.has(binding.sourceCode)) errors.push(`sourceCode ${binding.sourceCode} does not exist in DXF manifest`);
  if (binding.strategy !== SLOT_STRATEGY) errors.push(`strategy must be ${SLOT_STRATEGY}`);
  if (binding.coordinateSpace !== SLOT_COORDINATE_SPACE) errors.push(`coordinateSpace must be ${SLOT_COORDINATE_SPACE}`);
  if (binding.confidenceThreshold != null && !isConfidence(binding.confidenceThreshold)) errors.push('confidenceThreshold must be > 0 and <= 1');

  if (!binding.slots || typeof binding.slots !== 'object' || Array.isArray(binding.slots) || !Object.keys(binding.slots).length) {
    errors.push('slots must be a non-empty object');
    return;
  }

  const seenSemantic = new Set();
  for (const [slotLabel, slot] of Object.entries(binding.slots)) {
    validateSlot(slotLabel, slot, errors);
    const semantic = String(slot?.semanticLabel || slotLabel).trim().toLowerCase();
    if (seenSemantic.has(semantic)) errors.push(`duplicate semantic label ${semantic}`);
    seenSemantic.add(semantic);
  }
}

function validateSlot(label, slot, errors) {
  if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
    errors.push(`${label}: slot must be an object`);
    return;
  }
  if (slot.semanticLabel != null && !String(slot.semanticLabel).trim()) errors.push(`${label}: semanticLabel must be non-empty when present`);
  const labelText = asStringArray(slot.labelText);
  if (!labelText.length) errors.push(`${label}: labelText must be a non-empty string or string array`);
  const preferredValueKeys = asStringArray(slot.preferredValueKeys);
  if (!preferredValueKeys.length) errors.push(`${label}: preferredValueKeys must be a non-empty string array`);
  if (!SUPPORTED_FORMATS.has(slot.format)) errors.push(`${label}: unsupported format ${slot.format || '(missing)'}`);
  if (slot.suppressOverlayLabels != null && !Array.isArray(slot.suppressOverlayLabels)) errors.push(`${label}: suppressOverlayLabels must be a string array when present`);
  if (Array.isArray(slot.suppressOverlayLabels) && !asStringArray(slot.suppressOverlayLabels).length) errors.push(`${label}: suppressOverlayLabels must not be empty when present`);
  validateTarget(label, slot.target, errors);
}

function validateTarget(label, target, errors) {
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    errors.push(`${label}: target must be an object`);
    return;
  }
  if (!validBox(target.targetBox)) errors.push(`${label}: target.targetBox must be [minX,minY,maxX,maxY] finite numbers with min < max`);
  if (target.labelBox != null && !validBox(target.labelBox)) errors.push(`${label}: target.labelBox must be [minX,minY,maxX,maxY] finite numbers with min < max`);
  if (target.cleanupBox != null && !validBox(target.cleanupBox)) errors.push(`${label}: target.cleanupBox must be [minX,minY,maxX,maxY] finite numbers with min < max`);
  if (target.geometryBox != null && !validBox(target.geometryBox)) errors.push(`${label}: target.geometryBox must be [minX,minY,maxX,maxY] finite numbers with min < max`);
  for (const key of ['placeholderText', 'allowedExistingText', 'unitTextNearby', 'cleanupPlaceholderText']) {
    if (target[key] != null && !asStringArray(target[key]).length) errors.push(`${label}: target.${key} must be a non-empty string array when present`);
  }
  if (target.cleanupPlaceholders != null && typeof target.cleanupPlaceholders !== 'boolean') {
    errors.push(`${label}: target.cleanupPlaceholders must be boolean when present`);
  }
  if (target.hideGeometryWhenMissing != null && typeof target.hideGeometryWhenMissing !== 'boolean') {
    errors.push(`${label}: target.hideGeometryWhenMissing must be boolean when present`);
  }
  if (target.hideGeometryWhenMissing === true && !validBox(target.geometryBox)) {
    errors.push(`${label}: target.geometryBox is required when hideGeometryWhenMissing is true`);
  }
  if (target.artifactBoxes != null) validateArtifactBoxes(label, target.artifactBoxes, errors);
  if (target.maxDistanceFromLabel != null) {
    const value = Number(target.maxDistanceFromLabel);
    if (!Number.isFinite(value) || value <= 0) errors.push(`${label}: target.maxDistanceFromLabel must be a positive finite number`);
  }
}

function validateArtifactBoxes(label, artifactBoxes, errors) {
  if (!Array.isArray(artifactBoxes) || !artifactBoxes.length) {
    errors.push(`${label}: target.artifactBoxes must be a non-empty array when present`);
    return;
  }
  artifactBoxes.forEach((artifact, index) => {
    const prefix = `${label}: target.artifactBoxes[${index}]`;
    if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
      errors.push(`${prefix} must be an object`);
      return;
    }
    if (!validBox(artifact.box)) errors.push(`${prefix}.box must be [minX,minY,maxX,maxY] finite numbers with min < max`);
    const when = String(artifact.when || 'populated').trim().toLowerCase();
    if (!ARTIFACT_WHEN.has(when)) errors.push(`${prefix}.when must be one of ${[...ARTIFACT_WHEN].join(', ')}`);
    if (artifact.includeText != null && typeof artifact.includeText !== 'boolean') errors.push(`${prefix}.includeText must be boolean when present`);
    if (artifact.tags != null) {
      const tags = asStringArray(artifact.tags).map((tag) => tag.toLowerCase());
      if (!tags.length) errors.push(`${prefix}.tags must be a non-empty string array when present`);
      tags.forEach((tag) => { if (!ARTIFACT_TAGS.has(tag)) errors.push(`${prefix}.tags contains unsupported tag ${tag}`); });
    }
    if (artifact.strokeColors != null && !asStringArray(artifact.strokeColors).length) errors.push(`${prefix}.strokeColors must be a non-empty string array when present`);
    for (const key of ['maxWidth', 'maxHeight']) {
      if (artifact[key] != null) {
        const value = Number(artifact[key]);
        if (!Number.isFinite(value) || value <= 0) errors.push(`${prefix}.${key} must be a positive finite number`);
      }
    }
    if (artifact.reason != null && !String(artifact.reason).trim()) errors.push(`${prefix}.reason must be non-empty when present`);
  });
}

function scanDangerousValues(value, context, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanDangerousValues(item, `${context}[${index}]`, errors));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (DANGEROUS_VALUE_KEYS.has(key)) errors.push(`${context}: dangerous DB value field ${key} is not allowed`);
      scanDangerousValues(item, `${context}.${key}`, errors);
    }
    return;
  }
  if (typeof value !== 'string') return;
  const text = value.trim();
  if (!text) return;
  if (PLACEHOLDER_RE.test(text) && !allowedPlaceholderContext(context)) {
    errors.push(`${context}: placeholder text must not be embedded as a final slot value`);
  }
  if (HARD_CODED_VALUE_RE.test(text)) errors.push(`${context}: hardcoded numeric unit value is not allowed (${text})`);
}

function allowedPlaceholderContext(context) {
  return ['placeholderText', 'allowedExistingText', 'cleanupPlaceholderText'].some((part) => context.includes(part));
}

function validBox(value) {
  if (!Array.isArray(value) || value.length !== 4) return false;
  const box = value.map(Number);
  return box.every(Number.isFinite) && box[0] < box[2] && box[1] < box[3];
}

function isConfidence(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 1;
}

function asStringArray(value) {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list.map((item) => String(item || '').trim()).filter(Boolean);
}
