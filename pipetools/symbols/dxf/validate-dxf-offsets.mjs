import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const MANIFEST_PATH = path.join(repoRoot, 'pipetools/symbols/dxf/dxf-symbol-manifest.json');
const DOC_OFFSETS_PATH = path.join(repoRoot, 'docs/Pipedata/Database/Gensets/dxf-symbol-offsets.json');
const RUNTIME_OFFSETS_PATH = path.join(repoRoot, 'pipetools/data/dxf-symbol-offsets.json');
const SCHEMA = 'PipeToolsDxfSymbolOffsets.v1';
const CSS_LENGTH = /^-?\d+(?:\.\d+)?(?:px|vw|vh|%)$/;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${file}: ${error.message}`);
  }
}

function fail(message) {
  console.error(`DXF offset validation failed: ${message}`);
  process.exit(1);
}

function sourceCodes(manifest) {
  const codes = new Set();
  for (const symbol of manifest.symbols || []) {
    if (symbol.sourceCode) codes.add(symbol.sourceCode);
  }
  return codes;
}

function validateOffsetFile(label, file, manifestCodes) {
  const json = readJson(file);
  if (json.schema !== SCHEMA) fail(`${label}: expected schema ${SCHEMA}`);
  if (!json.offsets || typeof json.offsets !== 'object' || Array.isArray(json.offsets)) fail(`${label}: offsets must be an object`);
  for (const [code, offset] of Object.entries(json.offsets)) {
    if (!manifestCodes.has(code)) fail(`${label}: unknown sourceCode ${code}`);
    if (!offset || typeof offset !== 'object' || Array.isArray(offset)) fail(`${label}.${code}: offset must be an object`);
    if (!CSS_LENGTH.test(String(offset.panX ?? ''))) fail(`${label}.${code}: panX must be a CSS length such as 12px, -4vw, or 0%`);
    if (!CSS_LENGTH.test(String(offset.panY ?? ''))) fail(`${label}.${code}: panY must be a CSS length such as 12px, -4vh, or 0%`);
    const scale = Number(offset.scale);
    if (!Number.isFinite(scale) || scale <= 0 || scale > 5) fail(`${label}.${code}: scale must be finite and in range 0 < scale <= 5`);
    if (offset.updatedAt && Number.isNaN(Date.parse(offset.updatedAt))) fail(`${label}.${code}: updatedAt is not ISO-date parseable`);
    if (offset.source && typeof offset.source !== 'string') fail(`${label}.${code}: source must be a string when present`);
  }
  return json;
}

const manifestCodes = sourceCodes(readJson(MANIFEST_PATH));
if (!manifestCodes.size) fail('manifest has no symbols/sourceCode entries');

const docs = validateOffsetFile('docs defaults', DOC_OFFSETS_PATH, manifestCodes);
const runtime = validateOffsetFile('runtime defaults', RUNTIME_OFFSETS_PATH, manifestCodes);

if (JSON.stringify(docs.offsets || {}) !== JSON.stringify(runtime.offsets || {})) {
  fail('docs and runtime offset defaults have different offsets objects; promote/review in docs, then mirror to pipetools/data/dxf-symbol-offsets.json');
}

console.log(`DXF offset defaults OK: ${Object.keys(runtime.offsets || {}).length} calibrated symbol offsets, ${manifestCodes.size} manifest symbols.`);
