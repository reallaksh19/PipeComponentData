#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SLOT_VERSION = 'PipeToolsSvgSlotBinding.v2';
const LEGACY_VERSION = 'PipeToolsSvgSlotBinding.v1';
const SLOT_STRATEGY = 'populate-native-svg-text';
const SLOT_COORDINATE_SPACE = 'source-svg-viewBox';
const SUPPORTED_FORMATS = new Set(['diameter-mm', 'mm', 'kg', 'kg-per-m', 'count', 'text']);

const checkMode = process.argv.includes('--check');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(scriptDir, 'dxf-symbol-manifest.json');
const slotsDir = path.join(scriptDir, 'slots');
const reportPath = path.join(scriptDir, 'svg-slot-coverage-report.json');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const manifestCodes = new Set((manifest.symbols || []).map((symbol) => symbol.sourceCode).filter(Boolean));
const failures = [];
const backed = [];
let slotFileCount = 0;
let slotCount = 0;
let v2Count = 0;
let v1LegacyCount = 0;

let files = [];
try {
  files = (await readdir(slotsDir)).filter((name) => name.endsWith('.json')).sort();
} catch (error) {
  failures.push(`slots directory missing or unreadable: ${error.message}`);
}

for (const fileName of files) {
  slotFileCount += 1;
  const filePath = path.join(slotsDir, fileName);
  const basename = path.basename(fileName, '.json');
  let binding;
  try {
    binding = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    failures.push(`${fileName}: invalid JSON: ${error.message}`);
    continue;
  }
  if (binding?.version === LEGACY_VERSION) v1LegacyCount += 1;
  if (binding?.version === SLOT_VERSION) v2Count += 1;
  const errors = validateBinding(binding, basename);
  if (errors.length) {
    failures.push(...errors.map((error) => `${fileName}: ${error}`));
    continue;
  }
  backed.push(binding.sourceCode);
  slotCount += Object.keys(binding.slots).length;
}

backed.sort();
const missing = [...manifestCodes].filter((code) => !backed.includes(code)).sort();
const report = {
  schema: 'PipeToolsSvgSlotCoverage.v2',
  manifestSymbols: manifestCodes.size,
  slotBindingFiles: slotFileCount,
  v2SlotFiles: v2Count,
  v1LegacyFiles: v1LegacyCount,
  slotBackedSourceCodes: backed,
  missingSourceCodes: missing,
  slotCount,
  invalidSlotFiles: failures.length,
};

console.log('SVG slot binding coverage:');
console.log(`- manifest symbols: ${report.manifestSymbols}`);
console.log(`- slot binding files: ${report.slotBindingFiles}`);
console.log(`- v2 slot files: ${report.v2SlotFiles}`);
console.log(`- v1 legacy files: ${report.v1LegacyFiles}`);
console.log(`- slot-backed symbols: ${backed.join(', ') || '(none)'}`);
console.log(`- missing sourceCodes: ${missing.length}`);
console.log(`- slots: ${slotCount}`);
console.log(`- invalid slot files: ${failures.length}`);

if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

if (!checkMode) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

function validateBinding(binding, basename) {
  const errors = [];
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return ['root must be an object'];
  if (binding.version !== SLOT_VERSION) errors.push(`version must be ${SLOT_VERSION}`);
  if (binding.sourceCode !== basename) errors.push(`sourceCode must match file basename ${basename}`);
  if (!manifestCodes.has(binding.sourceCode)) errors.push(`sourceCode ${binding.sourceCode || '(missing)'} does not exist in DXF manifest`);
  if (binding.strategy !== SLOT_STRATEGY) errors.push(`strategy must be ${SLOT_STRATEGY}`);
  if (binding.coordinateSpace !== SLOT_COORDINATE_SPACE) errors.push(`coordinateSpace must be ${SLOT_COORDINATE_SPACE}`);
  if (!binding.slots || typeof binding.slots !== 'object' || Array.isArray(binding.slots) || !Object.keys(binding.slots).length) {
    errors.push('slots must be a non-empty object');
    return errors;
  }
  const seen = new Set();
  for (const [label, slot] of Object.entries(binding.slots)) {
    const semantic = String(slot?.semanticLabel || label).trim().toLowerCase();
    if (seen.has(semantic)) errors.push(`duplicate semantic label ${semantic}`);
    seen.add(semantic);
    if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
      errors.push(`${label}: slot must be an object`);
      continue;
    }
    if (!asStringArray(slot.labelText).length) errors.push(`${label}: missing labelText`);
    if (!asStringArray(slot.preferredValueKeys).length) errors.push(`${label}: missing preferredValueKeys`);
    if (!SUPPORTED_FORMATS.has(slot.format)) errors.push(`${label}: unsupported format ${slot.format || '(missing)'}`);
    if (!slot.target || typeof slot.target !== 'object' || Array.isArray(slot.target)) errors.push(`${label}: missing target object`);
    else {
      if (!validBox(slot.target.targetBox)) errors.push(`${label}: missing or invalid targetBox`);
      if (slot.target.labelBox != null && !validBox(slot.target.labelBox)) errors.push(`${label}: invalid labelBox`);
      if (slot.target.cleanupBox != null && !validBox(slot.target.cleanupBox)) errors.push(`${label}: invalid cleanupBox`);
      if (slot.target.geometryBox != null && !validBox(slot.target.geometryBox)) errors.push(`${label}: invalid geometryBox`);
      if (slot.target.hideGeometryWhenMissing != null && typeof slot.target.hideGeometryWhenMissing !== 'boolean') errors.push(`${label}: malformed hideGeometryWhenMissing`);
      if (slot.target.hideGeometryWhenMissing === true && !validBox(slot.target.geometryBox)) errors.push(`${label}: geometryBox required when hideGeometryWhenMissing is true`);
      if (slot.target.cleanupPlaceholders != null && typeof slot.target.cleanupPlaceholders !== 'boolean') errors.push(`${label}: malformed cleanupPlaceholders`);
      if (slot.target.cleanupPlaceholderText != null && !asStringArray(slot.target.cleanupPlaceholderText).length) errors.push(`${label}: malformed cleanupPlaceholderText`);
    }
    if (slot.suppressOverlayLabels != null && !Array.isArray(slot.suppressOverlayLabels)) errors.push(`${label}: malformed suppressOverlayLabels`);
  }
  return errors;
}

function validBox(value) {
  if (!Array.isArray(value) || value.length !== 4) return false;
  const box = value.map(Number);
  return box.every(Number.isFinite) && box[0] < box[2] && box[1] < box[3];
}

function asStringArray(value) {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list.map((item) => String(item || '').trim()).filter(Boolean);
}
