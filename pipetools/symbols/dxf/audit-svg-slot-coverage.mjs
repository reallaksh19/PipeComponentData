#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SLOT_VERSION = 'PipeToolsSvgSlotBinding.v1';
const SLOT_STRATEGY = 'populate-native-svg-text';
const SUPPORTED_FORMATS = new Set(['diameter-mm', 'mm', 'kg', 'kg-per-m', 'count', 'text']);

const checkMode = process.argv.includes('--check');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(scriptDir, 'dxf-symbol-manifest.json');
const slotsDir = path.join(scriptDir, 'slots');
const reportPath = path.join(scriptDir, 'svg-slot-coverage-report.json');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const manifestCodes = new Set((manifest.symbols || []).map((symbol) => symbol.sourceCode).filter(Boolean));
const failures = [];
const anchored = [];
let slotFileCount = 0;
let slotCount = 0;

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
  const errors = validateBinding(binding, basename);
  if (errors.length) {
    failures.push(...errors.map((error) => `${fileName}: ${error}`));
    continue;
  }
  anchored.push(binding.sourceCode);
  slotCount += Object.keys(binding.slots).length;
}

anchored.sort();
const missing = [...manifestCodes].filter((code) => !anchored.includes(code)).sort();
const report = {
  schema: 'PipeToolsSvgSlotCoverage.v1',
  manifestSymbols: manifestCodes.size,
  slotBindingFiles: slotFileCount,
  slotBackedSourceCodes: anchored,
  missingSourceCodes: missing,
  slotCount,
  invalidSlotFiles: failures.length,
};

console.log('SVG slot binding coverage:');
console.log(`- manifest symbols: ${report.manifestSymbols}`);
console.log(`- slot binding files: ${report.slotBindingFiles}`);
console.log(`- slot-backed symbols: ${anchored.join(', ') || '(none)'}`);
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
  if (!binding.slots || typeof binding.slots !== 'object' || Array.isArray(binding.slots) || !Object.keys(binding.slots).length) {
    errors.push('slots must be a non-empty object');
    return errors;
  }
  for (const [label, slot] of Object.entries(binding.slots)) {
    if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
      errors.push(`${label}: slot must be an object`);
      continue;
    }
    if (!asStringArray(slot.labelText).length) errors.push(`${label}: missing labelText`);
    if (!asStringArray(slot.preferredValueKeys).length) errors.push(`${label}: missing preferredValueKeys`);
    if (!SUPPORTED_FORMATS.has(slot.format)) errors.push(`${label}: unsupported format ${slot.format || '(missing)'}`);
    if (slot.placeholderNear != null && !asStringArray(slot.placeholderNear).length) errors.push(`${label}: malformed placeholderNear`);
    if (slot.suppressOverlayLabels != null && !Array.isArray(slot.suppressOverlayLabels)) errors.push(`${label}: malformed suppressOverlayLabels`);
  }
  return errors;
}

function asStringArray(value) {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list.map((item) => String(item || '').trim()).filter(Boolean);
}
