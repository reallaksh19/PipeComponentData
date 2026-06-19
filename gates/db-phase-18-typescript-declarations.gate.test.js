import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const apiSurface = JSON.parse(fs.readFileSync('contracts/api-surface.json', 'utf8'));
const publicPack = JSON.parse(fs.readFileSync('data/exports/public-export-pack.manifest.json', 'utf8'));
const declarationPath = 'src/index.d.ts';
const declaration = fs.readFileSync(declarationPath, 'utf8');

function hasDeclarationFor(symbol) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`export\\s+(?:declare\\s+)?(?:const|function|interface|type)\\s+${escaped}\\b`).test(declaration);
}

test('DB Phase 18: package declares TypeScript entrypoint', () => {
  assert.equal(packageJson.types, './src/index.d.ts');
  assert.ok(fs.existsSync(declarationPath));
});

test('DB Phase 18: declaration covers every locked public export', () => {
  const symbols = apiSurface['src/index.js'];
  assert.ok(Array.isArray(symbols));
  for (const symbol of symbols) assert.ok(hasDeclarationFor(symbol), `${symbol} missing from ${declarationPath}`);
});

test('DB Phase 18: declaration strongly types exact lookup contract', () => {
  assert.match(declaration, /export function lookupComponentExact\(query: string, assets\?: LookupAssets, options\?: LookupOptions\): LookupResult;/);
  assert.match(declaration, /export const LOOKUP_STATUS: Readonly</);
  assert.match(declaration, /NO_EXACT_MATCH: 'NO_EXACT_MATCH'/);
  assert.match(declaration, /CATALOG_ROW_MISSING: 'CATALOG_ROW_MISSING'/);
  assert.match(declaration, /INVALID_ASSETS: 'INVALID_ASSETS'/);
  assert.match(declaration, /export interface LookupProvenance/);
  assert.match(declaration, /export interface LookupAudit/);
});

test('DB Phase 18: public export-pack APIs are represented in declarations', () => {
  for (const api of publicPack.publicApis) {
    assert.ok(hasDeclarationFor(api.export), `${api.export} missing from ${declarationPath}`);
  }
});

test('DB Phase 18: declarations do not expose internal search helper as stable public API', () => {
  assert.equal(hasDeclarationFor('componentSearch'), false);
  assert.equal(hasDeclarationFor('SEARCH_MODE'), false);
});
