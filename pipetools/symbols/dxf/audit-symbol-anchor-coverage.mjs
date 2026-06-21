#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSymbolAnchor } from '../../js/svg/symbolAnchorStore.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const anchorsDir = path.join(here, 'anchors');
const manifestPath = path.join(here, 'dxf-symbol-manifest.json');
const reportPath = path.join(here, 'anchor-coverage-report.json');
const checkMode = process.argv.includes('--check');

const invalidAnchors = [];
let anchorFiles = [];
let validAnchorCount = 0;
const anchoredSourceCodes = [];

const manifest = await readJson(manifestPath, 'DXF symbol manifest');
const manifestSymbols = Array.isArray(manifest?.symbols) ? manifest.symbols : [];
const manifestSourceCodes = manifestSymbols.map((symbol) => symbol.sourceCode).filter(Boolean);
const manifestSourceCodeSet = new Set(manifestSourceCodes);

try {
  anchorFiles = (await readdir(anchorsDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
} catch (error) {
  invalidAnchors.push({ file: 'anchors', error: `directory is not readable: ${error.message}` });
}

for (const file of anchorFiles) {
  const filePath = path.join(anchorsDir, file);
  const sourceCode = file.replace(/\.json$/i, '');
  const text = await readText(filePath, file);
  if (!text) continue;

  for (const error of detectDuplicateAnchorLabels(text, file)) invalidAnchors.push({ file, sourceCode, error });
  const raw = parseJson(text, file);
  if (!raw) continue;

  const validation = validateSymbolAnchor(raw, { expectedSourceCode: sourceCode });
  if (!validation.ok) {
    validation.errors.forEach((error) => invalidAnchors.push({ file, sourceCode, error }));
    continue;
  }

  if (!manifestSourceCodeSet.has(sourceCode)) {
    invalidAnchors.push({ file, sourceCode, error: `sourceCode ${sourceCode} does not exist in dxf-symbol-manifest.json` });
    continue;
  }

  anchoredSourceCodes.push(sourceCode);
  validAnchorCount += Object.keys(validation.anchor.anchors || {}).length;
}

anchoredSourceCodes.sort((a, b) => a.localeCompare(b));
const anchoredSourceCodeSet = new Set(anchoredSourceCodes);
const missingSourceCodes = manifestSourceCodes.filter((sourceCode) => !anchoredSourceCodeSet.has(sourceCode));

const report = {
  schema: 'PipeToolsDxfSymbolAnchorCoverage.v1',
  manifestSymbols: manifestSourceCodes.length,
  anchorFiles: anchorFiles.length,
  validAnchors: validAnchorCount,
  anchoredSourceCodes,
  missingSourceCodes,
  invalidAnchors,
};

console.log('DXF symbol anchor coverage:');
console.log(`- manifest symbols: ${report.manifestSymbols}`);
console.log(`- anchor files: ${report.anchorFiles}`);
console.log(`- valid anchors: ${report.validAnchors}`);
console.log(`- anchored symbols: ${anchoredSourceCodes.join(', ') || '(none)'}`);
console.log(`- missing anchors: ${missingSourceCodes.join(', ') || '(none)'}`);
console.log(`- invalid anchors: ${invalidAnchors.length}`);

if (!checkMode) {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`- report: ${relative(reportPath)}`);
}

if (invalidAnchors.length) {
  invalidAnchors.forEach((item) => console.error(`- ${item.file}: ${item.error}`));
  process.exit(1);
}

async function readJson(filePath, label) {
  const text = await readText(filePath, label);
  return text ? parseJson(text, label) : null;
}

async function readText(filePath, label) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    invalidAnchors.push({ file: label, error: `read failed (${error.message})` });
    return '';
  }
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    invalidAnchors.push({ file: label, error: `JSON parse failed (${error.message})` });
    return null;
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
  return [...dupes].sort((a, b) => a.localeCompare(b)).map((label) => `duplicate anchor label ${label}`);
}

function objectBodyForProperty(text, propertyName) {
  const prop = `"${propertyName}"`;
  const index = text.indexOf(prop);
  if (index < 0) return '';
  const colon = text.indexOf(':', index + prop.length);
  if (colon < 0) return '';
  const start = text.indexOf('{', colon + 1);
  if (start < 0) return '';
  const end = matchingBrace(text, start);
  return end < 0 ? '' : text.slice(start + 1, end);
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
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
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
