#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'pipetools/symbols/dxf');
const requiredFields = ['id', 'sourceCode', 'sourceDxf', 'svg', 'title', 'family', 'componentType', 'subtype', 'dbLookup', 'quality'];
const errors = [];
const warnings = [];

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function asArray(value) { return Array.isArray(value) ? value : []; }

function uniqueCheck(items, field) {
  const seen = new Map();
  for (const item of items) {
    const value = item && item[field];
    if (!value) continue;
    if (seen.has(value)) fail(`Duplicate ${field}: ${value} (${seen.get(value)} and ${item.id || 'unknown'})`);
    seen.set(value, item.id || value);
  }
}

function validateSvgPath(svgPath, id) {
  if (!svgPath || typeof svgPath !== 'string') return fail(`${id}: svg must be a string`);
  if (!svgPath.startsWith('symbols/')) fail(`${id}: svg path must stay under symbols/: ${svgPath}`);
  const normalized = path.normalize(svgPath).replaceAll('\\', '/');
  if (normalized.startsWith('../') || path.isAbsolute(normalized)) fail(`${id}: svg path escapes symbol root: ${svgPath}`);
}

const manifestPath = path.join(root, 'dxf-symbol-manifest.json');
if (!fs.existsSync(manifestPath)) fail('Missing dxf-symbol-manifest.json');
const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : { symbols: [] };
const symbols = Array.isArray(manifest) ? manifest : asArray(manifest.symbols);

if (!symbols.length) fail('Manifest has no symbols[] entries');
uniqueCheck(symbols, 'id');
uniqueCheck(symbols, 'sourceCode');

for (const symbol of symbols) {
  for (const field of requiredFields) {
    if (symbol[field] === undefined || symbol[field] === null || symbol[field] === '') fail(`${symbol.id || 'UNKNOWN'}: missing ${field}`);
  }
  validateSvgPath(symbol.svg, symbol.id || 'UNKNOWN');
  if (symbol.svg && !exists(symbol.svg)) fail(`${symbol.id}: referenced SVG not found: ${symbol.svg}`);
  if (symbol.quality !== 'DXF_DERIVED') fail(`${symbol.id}: quality must be DXF_DERIVED`);
  if (!symbol.dbLookup || typeof symbol.dbLookup !== 'object' || Array.isArray(symbol.dbLookup)) fail(`${symbol.id}: dbLookup must be an object`);
}

const svgDir = path.join(root, 'symbols');
if (!fs.existsSync(svgDir)) fail('Missing symbols/ directory');
const svgFiles = fs.existsSync(svgDir) ? fs.readdirSync(svgDir).filter(name => name.toLowerCase().endsWith('.svg')).sort() : [];
const referenced = new Set(symbols.map(item => path.basename(item.svg || '')).filter(Boolean));
for (const file of svgFiles) {
  if (!referenced.has(file)) warn(`SVG exists but is not mapped in manifest: symbols/${file}`);
}

const fallbackPath = path.join(root, 'dxf-symbol-manifest.js');
if (!fs.existsSync(fallbackPath)) fail('Missing dxf-symbol-manifest.js fallback');
else {
  const text = fs.readFileSync(fallbackPath, 'utf8');
  if (!text.includes('DXF_SYMBOL_MANIFEST')) fail('Fallback JS must expose DXF_SYMBOL_MANIFEST');
  for (const symbol of symbols) {
    if (!text.includes(symbol.sourceCode)) fail(`Fallback JS does not include sourceCode: ${symbol.sourceCode}`);
  }
}

const auditPath = path.join(root, 'symbol-audit.json');
if (!fs.existsSync(auditPath)) warn('symbol-audit.json is missing');
else {
  const audit = readJson(auditPath);
  const total = audit && audit.convertedBatch && audit.convertedBatch.totalSvgFiles;
  const mapped = audit && audit.convertedBatch && audit.convertedBatch.mappedCount;
  if (typeof total === 'number' && total !== svgFiles.length) fail(`Audit totalSvgFiles mismatch: audit=${total}, actual=${svgFiles.length}`);
  if (typeof mapped === 'number' && mapped !== symbols.length) fail(`Audit mappedCount mismatch: audit=${mapped}, manifest=${symbols.length}`);
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}
console.log(`DXF symbol validation passed: ${symbols.length} manifest entries, ${svgFiles.length} SVG files.`);
