#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dimensionFacts, formatFact, weightFacts } from '../../js/dimensionDisplay.js';
import { requiredCalloutLabels } from '../../js/svg/dimensionCalloutTemplates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const manifestPath = path.join(repoRoot, 'pipetools/symbols/dxf/dxf-symbol-manifest.json');
const dbIndexPath = path.join(repoRoot, 'pipetools/data/db-index.json');
const reportPath = path.join(repoRoot, 'pipetools/symbols/dxf/callout-coverage-report.json');
const writeReport = !process.argv.includes('--check');
const SAMPLE_LIMIT = 8;

const aliases = new Map(Object.entries({
  WELD_NECK: 'WN', WELDNECK: 'WN', WN_FLANGE: 'WN', SLIP_ON: 'SO', SLIPON: 'SO', BLIND_FLANGE: 'BLIND',
  NON_METALLIC_FLAT_RING: 'FLAT_RING', FLAT: 'FLAT_RING', SWG: 'SPIRAL_WOUND', RING_TYPE_JOINT: 'RTJ',
  LONG_RADIUS_90_ELBOW: 'ELBOW_90', LR_90_ELBOW: 'ELBOW_90', ELBOW90: 'ELBOW_90', BEND_90: 'ELBOW_90',
  ELBOW45: 'ELBOW_45', BEND_45: 'ELBOW_45', EQUAL_TEE: 'TEE_STRAIGHT', STRAIGHT_TEE: 'TEE_STRAIGHT',
  REDUCING_TEE: 'TEE_REDUCING', RED_TEE: 'TEE_REDUCING', CONC: 'CONCENTRIC', ECC: 'ECCENTRIC',
  THREADOLET: 'THREDOLET', THREADOLET_: 'THREDOLET', SOCKETOLET: 'SOCKOLET',
  SWING_CHECK_VALVE: 'SWING_CHECK', WAFER_CHECK_VALVE: 'WAFER_CHECK', BUTTERFLY_VALVE: 'BUTTERFLY',
  FLANGE: 'FLANGED', FLG: 'FLANGED'
}));

const manifest = await readJson(manifestPath);
const dbIndex = await readJson(dbIndexPath);
const symbols = asArray(manifest.symbols).map(normalizeSymbol);
const familyReports = [];
let rowsScanned = 0;
let rowsWithDxfSymbol = 0;
let rowsWithoutDxfSymbol = 0;
let requiredChecks = 0;
let availableChecks = 0;
let missingChecks = 0;

for (const family of asArray(dbIndex.families)) {
  const rows = await loadFamilyRows(family);
  const report = newFamilyReport(family, rows.length);
  for (const row of rows) {
    rowsScanned += 1;
    const result = resolveSymbol(row);
    if (!result) {
      rowsWithoutDxfSymbol += 1;
      report.noSymbolRows += 1;
      pushSample(report.noSymbolExamples, rowSample(row));
      continue;
    }
    rowsWithDxfSymbol += 1;
    report.dxfRows += 1;
    const source = symbolBucket(report, result.sourceCode, result.symbol);
    const facts = factMap([...dimensionFacts(row), ...weightFacts(row)]);
    const required = requiredCalloutLabels(result.symbol);
    source.rows += 1;
    for (const label of required) {
      requiredChecks += 1;
      bump(source.required, label);
      if (facts.has(label)) {
        availableChecks += 1;
        bump(source.available, label);
        pushSample(source.availableExamples[label], factSample(row, facts.get(label)));
      } else {
        missingChecks += 1;
        bump(source.missing, label);
        pushSample(source.missingExamples[label], rowSample(row));
      }
    }
  }
  finalizeFamily(report);
  familyReports.push(report);
}

const output = {
  schema: 'PipeToolsDxfCalloutCoverage.v1',
  generatedAt: new Date().toISOString(),
  policy: 'This report audits normalized DB rows against DXF callout templates. Missing values are data/remediation targets and must not be rendered as placeholder arrows.',
  summary: {
    families: familyReports.length,
    symbols: symbols.length,
    rowsScanned,
    rowsWithDxfSymbol,
    rowsWithoutDxfSymbol,
    requiredChecks,
    availableChecks,
    missingChecks,
    coveragePercent: requiredChecks ? round((availableChecks / requiredChecks) * 100, 1) : 0,
  },
  families: familyReports,
};

if (writeReport) await writeFile(reportPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(output.summary, null, 2));

async function loadFamilyRows(family) {
  const paths = [...asArray(family.repositoryPaths), ...asArray(family.repositoryPath)].filter(Boolean);
  const packs = [];
  for (const rel of paths) {
    const packPath = path.join(repoRoot, rel);
    const pack = await readJson(packPath);
    packs.push(...normalizePackRows(pack).map((row) => ({ ...row, __pack: rel })));
  }
  return dedupeRows(packs);
}

function normalizePackRows(pack) {
  if (Array.isArray(pack)) return pack;
  if (Array.isArray(pack?.rows)) return pack.rows;
  if (Array.isArray(pack?.data)) return pack.data;
  if (Array.isArray(pack?.items)) return pack.items;
  if (pack && typeof pack === 'object') return Object.values(pack).flatMap((value) => Array.isArray(value) ? value : []);
  return [];
}

function dedupeRows(rows) {
  const byId = new Map();
  rows.forEach((row, index) => {
    const id = row?.id ?? `${row?.componentType || row?.component || 'ROW'}:${index}`;
    if (!byId.has(id)) byId.set(id, row);
  });
  return [...byId.values()];
}

function resolveSymbol(row) {
  const matches = symbols.filter((symbol) => lookupMatches(row, symbol.dbLookup));
  if (!matches.length) return null;
  const symbol = matches.sort((a, b) => scoreSymbol(b, row) - scoreSymbol(a, row))[0];
  return { symbol, sourceCode: symbol.sourceCode };
}

function lookupMatches(row, lookup) {
  const entries = Object.entries(lookup || {}).filter(([, value]) => value !== '' && value != null);
  if (!entries.length) return false;
  return entries.every(([key, expected]) => norm(semanticValue(row, key)) === norm(expected));
}

function scoreSymbol(symbol, row) {
  const lookupWeight = Object.keys(symbol.dbLookup || {}).length * 10;
  const fieldWeight = ['facing', 'endType', 'classRating', 'nps'].reduce((score, key) => {
    const expected = symbol[key];
    const actual = semanticValue(row, key);
    return expected && actual && norm(expected) === norm(actual) ? score + 1 : score;
  }, 0);
  return lookupWeight + fieldWeight + standardScore(symbol, row);
}

function standardScore(symbol, row) {
  const rowStandard = norm(semanticValue(row, 'standard'));
  if (!rowStandard || !symbol.standard) return 0;
  const symbolStandard = norm(symbol.standard);
  return symbolStandard.includes(rowStandard) || rowStandard.includes(symbolStandard) ? 5 : 0;
}

function semanticValue(row, key) {
  const lookups = {
    componentType: ['componentType', 'componentFamily', 'family', 'component'],
    subtype: ['subtype', 'type', 'fittingType', 'flangeType', 'gasketType', 'reducerType', 'oletType'],
    valveType: ['valveType', 'subtype', 'type'],
    reducerType: ['reducerType', 'subtype', 'type'],
    oletType: ['oletType', 'subtype', 'type'],
    endType: ['endType', 'endConnection', 'connectionType'],
    facing: ['facing', 'faceType'],
    classRating: ['classRating', 'rating', 'pressureClass'],
    nps: ['nps', 'largeNps', 'nominalSize'],
    standard: ['standard', 'sourceStandard']
  }[key] || [key];
  for (const name of lookups) {
    const value = rowField(row, name);
    if (value !== '' && value != null) return value;
  }
  return undefined;
}

function rowField(row, key) {
  if (!row || typeof row !== 'object') return undefined;
  if (Object.hasOwn(row, key)) return unwrap(row[key]);
  const match = Object.keys(row).find((name) => norm(name) === norm(key));
  return match ? unwrap(row[match]) : undefined;
}

function normalizeSymbol(symbol) {
  return {
    ...symbol,
    sourceCode: symbol.sourceCode || symbol.code,
    sourceDxf: symbol.sourceDxf || `${String(symbol.sourceCode || symbol.code || '').toLowerCase()}.dxf`,
    title: symbol.title || symbol.label || symbol.id,
    dbLookup: symbol.dbLookup || symbol.lookup || {},
    quality: symbol.quality || 'DXF_DERIVED'
  };
}

function newFamilyReport(family, rows) {
  return {
    family: family.family,
    label: family.label,
    standard: family.standard,
    rows,
    dxfRows: 0,
    noSymbolRows: 0,
    noSymbolExamples: [],
    symbols: {},
  };
}

function symbolBucket(report, sourceCode, symbol) {
  report.symbols[sourceCode] ??= {
    sourceCode,
    title: symbol.title,
    family: symbol.family,
    subtype: symbol.subtype,
    rows: 0,
    required: {},
    available: {},
    missing: {},
    availableExamples: {},
    missingExamples: {},
  };
  return report.symbols[sourceCode];
}

function finalizeFamily(report) {
  report.symbols = Object.fromEntries(Object.entries(report.symbols).map(([sourceCode, bucket]) => {
    const requiredTotal = sum(bucket.required);
    const availableTotal = sum(bucket.available);
    const missingTotal = sum(bucket.missing);
    return [sourceCode, {
      sourceCode: bucket.sourceCode,
      title: bucket.title,
      family: bucket.family,
      subtype: bucket.subtype,
      rows: bucket.rows,
      requiredChecks: requiredTotal,
      availableChecks: availableTotal,
      missingChecks: missingTotal,
      coveragePercent: requiredTotal ? round((availableTotal / requiredTotal) * 100, 1) : 0,
      missing: bucket.missing,
      missingExamples: bucket.missingExamples,
      available: bucket.available,
      availableExamples: bucket.availableExamples,
    }];
  }).sort(([a], [b]) => a.localeCompare(b)));
}

function factMap(facts) {
  const map = new Map();
  facts.filter(Boolean).forEach((fact) => {
    if (!map.has(fact.label)) map.set(fact.label, fact);
  });
  return map;
}

function rowSample(row) {
  return {
    id: row.id ?? null,
    pack: row.__pack ?? null,
    componentType: semanticValue(row, 'componentType') ?? null,
    subtype: semanticValue(row, 'subtype') ?? semanticValue(row, 'valveType') ?? null,
    endType: semanticValue(row, 'endType') ?? null,
    facing: semanticValue(row, 'facing') ?? null,
    classRating: semanticValue(row, 'classRating') ?? null,
    nps: semanticValue(row, 'nps') ?? null,
  };
}

function factSample(row, fact) {
  return { ...rowSample(row), value: formatFact(fact), path: fact.path || null };
}

function pushSample(target, sample) {
  if (!target) return;
  if (target.length < SAMPLE_LIMIT) target.push(sample);
}

function bump(target, key) {
  target[key] = (target[key] || 0) + 1;
}

function sum(object) {
  return Object.values(object || {}).reduce((total, value) => total + Number(value || 0), 0);
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function norm(value) {
  const raw = String(value ?? '').trim().toUpperCase().replace(/^CL\s*/i, '').replace(/[#]/g, '').replace(/[\s\-\/]+/g, '_');
  return aliases.get(raw) || raw;
}

function unwrap(value) {
  return value && typeof value === 'object' && 'value' in value ? value.value : value;
}

function round(value, digits) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}
