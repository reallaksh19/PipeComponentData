#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SLOT_VERSION = 'PipeToolsSvgSlotBinding.v1';
const SLOT_STRATEGY = 'populate-native-svg-text';
const SUPPORTED_FORMATS = new Set(['diameter-mm', 'mm', 'kg', 'kg-per-m', 'count', 'text']);
const PLACEHOLDER_RE = /^(?:—|–|-|null|undefined)?$/i;
const HARD_CODED_VALUE_RE = /\b\d+(?:\.\d+)?\s*(?:mm|cm|m|kg|kg\/m|kg\s*\/\s*m|cm4|mtr)\b/i;
const DANGEROUS_VALUE_KEYS = new Set(['value', 'displayValue', 'actualValue', 'dbValue', 'dimensionValue', 'weightValue']);

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

  if (!binding.slots || typeof binding.slots !== 'object' || Array.isArray(binding.slots) || !Object.keys(binding.slots).length) {
    errors.push('slots must be a non-empty object');
    return;
  }

  const seen = new Set();
  for (const [slotLabel, slot] of Object.entries(binding.slots)) {
    if (seen.has(slotLabel)) errors.push(`duplicate slot label ${slotLabel}`);
    seen.add(slotLabel);
    validateSlot(slotLabel, slot, errors);
  }
}

function validateSlot(label, slot, errors) {
  if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
    errors.push(`${label}: slot must be an object`);
    return;
  }
  const labelText = asStringArray(slot.labelText);
  if (!labelText.length) errors.push(`${label}: labelText must be a non-empty string or string array`);
  const preferredValueKeys = asStringArray(slot.preferredValueKeys);
  if (!preferredValueKeys.length) errors.push(`${label}: preferredValueKeys must be a non-empty string array`);
  if (!SUPPORTED_FORMATS.has(slot.format)) errors.push(`${label}: unsupported format ${slot.format || '(missing)'}`);
  if (slot.placeholderNear != null && !asStringArray(slot.placeholderNear).length) errors.push(`${label}: placeholderNear must be a non-empty string or string array when present`);
  if (slot.suppressOverlayLabels != null && !Array.isArray(slot.suppressOverlayLabels)) errors.push(`${label}: suppressOverlayLabels must be a string array when present`);
  if (Array.isArray(slot.suppressOverlayLabels) && !asStringArray(slot.suppressOverlayLabels).length) errors.push(`${label}: suppressOverlayLabels must not be empty when present`);
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
  if (PLACEHOLDER_RE.test(text) && !['placeholderNear'].some((part) => context.includes(part))) {
    errors.push(`${context}: placeholder text must not be embedded as a final slot value`);
  }
  if (HARD_CODED_VALUE_RE.test(text)) errors.push(`${context}: hardcoded numeric unit value is not allowed (${text})`);
}

function asStringArray(value) {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list.map((item) => String(item || '').trim()).filter(Boolean);
}
