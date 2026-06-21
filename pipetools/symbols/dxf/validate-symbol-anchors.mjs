#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSymbolAnchor } from '../../js/svg/symbolAnchorStore.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const anchorsDir = path.join(here, 'anchors');
const manifestPath = path.join(here, 'dxf-symbol-manifest.json');
const DIMENSION_TEXT_RE = /\b\d+(?:\.\d+)?\s*(?:mm|kg\s*\/\s*m|kg|inch|in\b|\")/i;
const PLACEHOLDER_RE = /^(?:—|–|-|null|undefined)$/i;

const errors = [];
let totalAnchors = 0;

const manifest = await readJsonFile(manifestPath, 'DXF symbol manifest');
const manifestSourceCodes = new Set((manifest?.symbols || []).map((symbol) => symbol?.sourceCode).filter(Boolean));

let files = [];
try {
  files = (await readdir(anchorsDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
} catch (error) {
  errors.push(`anchors directory is not readable: ${relative(anchorsDir)} (${error.message})`);
}

if (!files.length) errors.push('no anchor JSON files found');

for (const file of files) {
  const filePath = path.join(anchorsDir, file);
  const sourceCode = file.replace(/\.json$/i, '');
  const raw = await readJsonFile(filePath, file);
  if (!raw) continue;

  const validation = validateSymbolAnchor(raw, { expectedSourceCode: sourceCode });
  if (!validation.ok) {
    validation.errors.forEach((message) => errors.push(`${file}: ${message}`));
    continue;
  }

  if (!manifestSourceCodes.has(sourceCode)) errors.push(`${file}: sourceCode ${sourceCode} does not exist in dxf-symbol-manifest.json`);

  scanForEmbeddedValues(raw, [file]);
  totalAnchors += Object.keys(validation.anchor.anchors || {}).length;
}

if (errors.length) {
  console.error('DXF symbol anchor validation failed:');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`DXF symbol anchor validation passed: ${files.length} files, ${totalAnchors} anchors`);

async function readJsonFile(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${label}: JSON parse/read failed (${error.message})`);
    return null;
  }
}

function scanForEmbeddedValues(value, trail) {
  if (typeof value === 'string') {
    const text = value.trim();
    if (PLACEHOLDER_RE.test(text)) errors.push(`${trail.join('.')}: placeholder value is not allowed`);
    if (DIMENSION_TEXT_RE.test(text)) errors.push(`${trail.join('.')}: hardcoded dimension/weight text is not allowed (${text})`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForEmbeddedValues(item, [...trail, String(index)]));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (/^(?:value|displayValue|actualValue|dbValue)$/i.test(key)) errors.push(`${trail.join('.')}.${key}: DB value fields are not allowed in anchor JSON`);
      scanForEmbeddedValues(child, [...trail, key]);
    }
  }
}

function relative(filePath) {
  return path.relative(process.cwd(), filePath) || filePath;
}
