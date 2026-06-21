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
const SAFE_TOP_LEVEL = new Set(['version', 'sourceCode', 'viewBox', 'units', 'description', 'anchors']);
const SAFE_SPEC_PROPS = new Set(['kind', 'p1', 'p2', 'from', 'to', 'labelAt', 'preferredValueKeys']);

const errors = [];
const warnings = [];
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
  const text = await readTextFile(filePath, file);
  if (!text) continue;

  detectDuplicateAnchorLabels(text, file).forEach((message) => errors.push(message));
  const raw = parseJson(text, file);
  if (!raw) continue;

  const validation = validateSymbolAnchor(raw, { expectedSourceCode: sourceCode });
  if (!validation.ok) {
    validation.errors.forEach((message) => errors.push(`${file}: ${message}`));
    continue;
  }

  if (!manifestSourceCodes.has(sourceCode)) errors.push(`${file}: sourceCode ${sourceCode} does not exist in dxf-symbol-manifest.json`);

  validatePreferredValueKeys(raw, file);
  scanForEmbeddedValues(raw, [file]);
  warnUnknownProperties(raw, file);

  totalAnchors += Object.keys(validation.anchor.anchors || {}).length;
}

if (warnings.length) {
  console.warn('DXF symbol anchor validation warnings:');
  warnings.forEach((message) => console.warn(`- ${message}`));
}

if (errors.length) {
  console.error('DXF symbol anchor validation failed:');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`DXF symbol anchor validation passed: ${files.length} files, ${totalAnchors} anchors`);

async function readJsonFile(filePath, label) {
  const text = await readTextFile(filePath, label);
  return text ? parseJson(text, label) : null;
}

async function readTextFile(filePath, label) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    errors.push(`${label}: read failed (${error.message})`);
    return '';
  }
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`${label}: JSON parse failed (${error.message})`);
    return null;
  }
}

function validatePreferredValueKeys(raw, file) {
  for (const [label, spec] of Object.entries(raw?.anchors || {})) {
    if (!Object.hasOwn(spec || {}, 'preferredValueKeys')) continue;
    const keys = spec.preferredValueKeys;
    if (!Array.isArray(keys) || keys.length === 0 || keys.some((item) => typeof item !== 'string' || !item.trim())) {
      errors.push(`${file}.${label}.preferredValueKeys must be a non-empty string array when present`);
    }
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

function warnUnknownProperties(raw, file) {
  Object.keys(raw || {}).filter((key) => !SAFE_TOP_LEVEL.has(key)).forEach((key) => warnings.push(`${file}: unknown top-level property ${key}`));
  for (const [label, spec] of Object.entries(raw?.anchors || {})) {
    Object.keys(spec || {}).filter((key) => !SAFE_SPEC_PROPS.has(key)).forEach((key) => warnings.push(`${file}.${label}: unknown anchor property ${key}`));
  }
}

function detectDuplicateAnchorLabels(text, file) {
  const body = objectBodyForProperty(text, 'anchors');
  if (!body) return [];
  const labels = firstLevelObjectKeys(body);
  const seen = new Set();
  const dupes = new Set();
  for (const label of labels) {
    if (seen.has(label)) dupes.add(label);
    seen.add(label);
  }
  return [...dupes].sort((a, b) => a.localeCompare(b)).map((label) => `${file}: duplicate anchor label ${label}`);
}

function objectBodyForProperty(text, propertyName) {
  const prop = `"${propertyName}"`;
  let index = text.indexOf(prop);
  while (index >= 0) {
    const colon = text.indexOf(':', index + prop.length);
    if (colon < 0) return '';
    const start = text.indexOf('{', colon + 1);
    if (start < 0) return '';
    const end = matchingBrace(text, start);
    if (end < 0) return '';
    return text.slice(start + 1, end);
  }
  return '';
}

function matchingBrace(text, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function firstLevelObjectKeys(body) {
  const keys = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let stringStart = -1;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') {
        inString = false;
        if (depth === 0 && nextNonWhitespace(body, i + 1) === ':') keys.push(JSON.parse(body.slice(stringStart, i + 1)));
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      stringStart = i;
    } else if (ch === '{' || ch === '[') {
      depth += 1;
    } else if (ch === '}' || ch === ']') {
      depth -= 1;
    }
  }
  return keys;
}

function nextNonWhitespace(text, start) {
  for (let i = start; i < text.length; i += 1) {
    if (!/\s/.test(text[i])) return text[i];
  }
  return '';
}

function relative(filePath) {
  return path.relative(process.cwd(), filePath) || filePath;
}
