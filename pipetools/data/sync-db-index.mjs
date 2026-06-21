#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const NORMALIZED_DIR = path.join(REPO_ROOT, 'data/normalized');
const INDEX_PATH = path.join(REPO_ROOT, 'pipetools/data/db-index.json');

const FAMILY_CONFIG = [
  family('PIPE', 'Pipe', /^pipes(?:[.-]|$)/, 'PROJECT_PIPE_TABLE', ['PIPE'], ['componentType', 'nps', 'dn', 'schedule'], ['id', 'nps', 'dn', 'schedule', 'standard', 'source', 'dataStatus'], ['componentType', 'nps', 'dn', 'schedule', 'dataStatus', 'materialFamily'], true),
  family('VALVE', 'Valve', /^valves(?:[.-]|$)/, 'ASME B16.10', ['GATE', 'GLOBE', 'BALL', 'CONTROL'], ['componentType', 'valveType', 'endType', 'nps', 'classRating', 'facing'], ['id', 'valveType', 'nps', 'dn', 'classRating', 'facing', 'standard', 'source', 'dataStatus'], ['componentType', 'valveType', 'subtype', 'endType', 'facing', 'classRating', 'nps', 'dn', 'dataStatus'], true),
  family('FLANGE', 'Flange', /^flanges(?:[.-]|$)/, 'ASME B16.5', ['WN', 'SO', 'BLIND'], ['componentType', 'subtype', 'facing', 'nps', 'classRating'], ['id', 'subtype', 'nps', 'dn', 'classRating', 'facing', 'standard', 'source', 'dataStatus'], ['componentType', 'subtype', 'facing', 'classRating', 'nps', 'dataStatus'], true),
  family('FITTING', 'Fitting', /^fittings(?:[.-]|$)/, 'ASME B16.9', ['ELBOW_90', 'ELBOW_45', 'TEE_STRAIGHT', 'CAP'], ['componentType', 'subtype', 'nps', 'schedule'], ['id', 'subtype', 'nps', 'dn', 'schedule', 'standard', 'source', 'dataStatus'], ['componentType', 'subtype', 'schedule', 'nps', 'dn', 'dataStatus'], true),
  family('GASKET', 'Gasket', /^gaskets(?:[.-]|$)/, 'ASME B16.20 / B16.21', ['FLAT_RING', 'RTJ', 'SPIRAL_WOUND'], ['componentType', 'subtype', 'facing', 'nps', 'classRating'], ['id', 'subtype', 'nps', 'classRating', 'facing', 'standard', 'source', 'dataStatus'], ['componentType', 'subtype', 'facing', 'classRating', 'nps', 'dataStatus'], true),
  family('SUPPORT', 'Support', /^supports(?:[.-]|$)/, 'PROJECT_SUPPORT_DEFAULTS', ['SHOE', 'GUIDE'], ['componentFamily', 'supportKind'], ['id', 'supportKind', 'attachmentRule', 'standard', 'source', 'dataStatus'], ['componentFamily', 'supportKind', 'attachmentRule', 'dataStatus'], false),
  family('REDUCER', 'Reducer', /^reducers(?:[.-]|$)/, 'ASME B16.9', ['CONCENTRIC', 'ECCENTRIC'], ['componentType', 'reducerType', 'largeNps', 'smallNps', 'largeSchedule'], ['id', 'reducerType', 'largeNps', 'smallNps', 'largeSchedule', 'standard', 'source', 'dataStatus'], ['componentType', 'subtype', 'schedule', 'nps', 'dataStatus'], false),
  family('OLET', 'Olet', /^olets(?:[.-]|$)/, 'ASME B16.11 / MSS SP-97', ['WELDOLET', 'SOCKOLET', 'THREDOLET', 'ELBOLET'], ['componentType', 'oletType', 'nps', 'scheduleOrRating', 'dataStatus'], ['id', 'oletType', 'nps', 'dn', 'scheduleOrRating', 'standard', 'source', 'dataStatus'], ['componentType', 'subtype', 'schedule', 'nps', 'dn', 'dataStatus'], false),
];

function family(familyKey, label, pattern, standard, subtypes, keyFields, searchFields, availableFilters, svgSupported) {
  return { family: familyKey, label, pattern, standard, subtypes, keyFields, searchFields, availableFilters, svgSupported };
}

const mode = process.argv.includes('--write') ? 'write' : 'check';
const index = await buildDbIndex();
const serialized = `${JSON.stringify(index, null, 2)}\n`;

if (mode === 'write') {
  await writeFile(INDEX_PATH, serialized, 'utf8');
  console.log(`Wrote ${path.relative(REPO_ROOT, INDEX_PATH)} with ${index.families.length} families.`);
} else {
  const current = await readFile(INDEX_PATH, 'utf8');
  if (current !== serialized) {
    console.error('PipeTools DB index is stale. Run: node pipetools/data/sync-db-index.mjs --write');
    process.exit(1);
  }
  console.log(`PipeTools DB index is synchronized: ${index.families.length} families, ${index.families.reduce((sum, item) => sum + item.rowCount, 0)} rows.`);
}

async function buildDbIndex() {
  const fileNames = (await readdir(NORMALIZED_DIR)).filter((name) => name.endsWith('.json')).sort((a, b) => a.localeCompare(b));
  const families = [];
  const indexedFiles = new Set();

  for (const config of FAMILY_CONFIG) {
    const files = fileNames.filter((name) => config.pattern.test(name));
    if (!files.length) throw new Error(`No normalized packs found for ${config.family}`);
    files.forEach((name) => indexedFiles.add(name));
    const packs = await Promise.all(files.map((name) => readPack(name)));
    const rows = packs.flatMap((pack) => pack.rows);
    const sources = new Set(rows.map(sourceOfRow).filter(Boolean));
    const repositoryPaths = files.map((name) => `data/normalized/${name}`);
    const runtimeUrls = files.map((name) => `../data/normalized/${name}`);
    const rowCount = rows.length;
    families.push({
      family: config.family,
      label: config.label,
      componentType: config.family,
      subtypes: config.subtypes,
      standard: config.standard,
      repositoryPaths,
      runtimeUrls,
      repositoryPath: repositoryPaths[0],
      runtimeUrl: runtimeUrls[0],
      rowCount,
      sourceRowCount: rowCount,
      sourceFileCount: sources.size || packs.length,
      sourcePackCount: packs.length,
      keyFields: config.keyFields,
      searchFields: config.searchFields,
      availableFilters: config.availableFilters,
      svgSupported: config.svgSupported,
      notes: [`Generated from ${packs.length} committed normalized pack(s); rowCount/sourceRowCount count normalized runtime rows only.`],
    });
  }

  const unindexed = fileNames.filter((name) => !indexedFiles.has(name));
  if (unindexed.length) {
    throw new Error(`Unindexed normalized packs: ${unindexed.map((name) => `data/normalized/${name}`).join(', ')}`);
  }

  return {
    schema: 'pipetools-db-index/v3',
    generatedBy: 'pipetools/data/sync-db-index.mjs',
    policy: {
      loadOrder: 'Load this index first, then lazy-load every runtimeUrls pack for the selected family and de-duplicate by stable row id.',
      rawSourcePolicy: 'Do not publish docs/Pipedata/Database raw DB tree to Pages; publish normalized DB packs only.',
      coveragePolicy: 'sourceRowCount is the committed normalized runtime row count; raw source coverage is audited separately under data/audit.',
      syncPolicy: 'Run node pipetools/data/sync-db-index.mjs --write whenever data/normalized changes; CI runs --check to block stale indexes.',
      svgPolicy: 'svgSupported is an advertised legacy/native routing flag only; DXF-manifest symbols may still resolve even when this flag is false. Unsupported rows must show explicit SVG-not-available, not a wrong fallback.'
    },
    families,
  };
}

function sourceOfRow(row = {}) {
  return row.source ?? row.provenance?.source ?? null;
}

async function readPack(name) {
  const filePath = path.join(NORMALIZED_DIR, name);
  const payload = JSON.parse(await readFile(filePath, 'utf8'));
  if (!Array.isArray(payload.rows)) throw new Error(`Missing rows[] in data/normalized/${name}`);
  return { name, rows: payload.rows, payload };
}
