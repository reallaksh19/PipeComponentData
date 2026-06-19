import fs from 'node:fs';
import path from 'node:path';
import { splitCsvRows } from './src/sourceParsers/csvCells.js';
import { parseButtweldFittingTable, parseReducingTeeTable, fittingKey } from './src/db/fittingCatalog.js';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');

const cell = (raw, index) => {
  const v = String(raw[index] ?? '').trim();
  return v === '' || /^(N\/A|N\/N|SPA)$/i.test(v) ? null : v;
};
const number = (raw, index) => {
  const v = cell(raw, index);
  return v !== null && Number.isFinite(Number(v)) ? Number(v) : null;
};

function parsePipeCsv(text, relativePath, schedule) {
  const rows = splitCsvRows(text);
  const dataRows = [];
  rows.slice(1).forEach((raw, i) => {
    const sourceRow = i + 2;
    const nps = cell(raw, 0);
    if (!nps) return;
    const dn = number(raw, 1);
    const odMm = number(raw, 2);
    const wallMm = number(raw, 3);
    const halfOdMm = number(raw, 4);
    const idMm = number(raw, 5);
    const weightKgPerM = number(raw, 6);
    const weightWithWaterKgPerM = number(raw, 7);
    const momentOfInertiaSource = number(raw, 8);

    const valueBasis = {
      odMm: odMm !== null ? 'SOURCE_VALUE' : 'UNAVAILABLE',
      wallMm: wallMm !== null ? 'SOURCE_VALUE' : 'UNAVAILABLE',
      halfOdMm: halfOdMm !== null ? 'SOURCE_VALUE' : 'UNAVAILABLE',
      idMm: idMm !== null ? 'SOURCE_VALUE' : 'UNAVAILABLE',
      weightKgPerM: weightKgPerM !== null ? 'SOURCE_VALUE' : 'UNAVAILABLE',
      weightWithWaterKgPerM: weightWithWaterKgPerM !== null ? 'SOURCE_VALUE' : 'UNAVAILABLE',
      momentOfInertiaSource: momentOfInertiaSource !== null ? 'SOURCE_VALUE' : 'UNAVAILABLE'
    };

    const isPartial = [odMm, wallMm, halfOdMm, idMm, weightKgPerM, weightWithWaterKgPerM, momentOfInertiaSource].some(v => v === null);
    const dataStatus = isPartial ? 'PARTIAL' : 'READY';

    dataRows.push({
      id: `PIPE|NPS${nps}|SCH${schedule}`,
      componentType: 'PIPE',
      nps,
      dn,
      schedule,
      odMm,
      wallMm,
      halfOdMm,
      idMm,
      weightKgPerM,
      weightWithWaterKgPerM,
      momentOfInertiaSource,
      unitSystem: 'METRIC',
      materialFamily: 'CS',
      standard: 'PROJECT_PIPE_TABLE',
      source: relativePath,
      sourceRow,
      datasetVersion: 'pipedata-db/2026.06.dbphase85',
      dataStatus,
      valueBasis
    });
  });
  return dataRows;
}

function parseReducerCsv(text, relativePath, schedule) {
  const rows = splitCsvRows(text);
  const header = rows[1];
  const dataRows = [];
  rows.slice(2).forEach((raw, i) => {
    const sourceRowNumber = i + 3;
    const largeNps = cell(raw, 0);
    if (!largeNps) return;
    const largeDn = number(raw, 1);
    const largeEndOdMm = number(raw, 2);

    for (let colIdx = 4; colIdx <= 38; colIdx++) {
      const smallNps = header[colIdx];
      const lengthVal = number(raw, colIdx);
      if (lengthVal === null || lengthVal === 0) continue;
      
      const weightVal = number(raw, colIdx + 39);

      const dimensions = {
        largeEndOdMm: largeEndOdMm !== null 
          ? { value: largeEndOdMm, unit: 'mm', basis: 'SOURCE_VALUE', sourceColumn: 'od' }
          : { value: null, unit: 'mm', basis: 'UNAVAILABLE', sourceColumn: 'od' },
        overallLengthMm: {
          value: lengthVal,
          unit: 'mm',
          basis: 'SOURCE_VALUE',
          sourceColumn: `Length H [row=${largeNps},col=${smallNps},left-half]`
        }
      };

      const weights = {
        weightKg: weightVal !== null
          ? { value: weightVal, unit: 'kg', basis: 'SOURCE_VALUE', sourceColumn: `Approximate Weight KG [row=${largeNps},col=${smallNps},right-half]` }
          : { value: null, unit: 'kg', basis: 'UNAVAILABLE', sourceColumn: `Approximate Weight KG [row=${largeNps},col=${smallNps},right-half]` }
      };

      const isReady = largeEndOdMm !== null && lengthVal !== null && weightVal !== null;
      const dataStatus = isReady ? 'READY' : 'PARTIAL';

      for (const reducerType of ['CONCENTRIC', 'ECCENTRIC']) {
        dataRows.push({
          id: `REDUCER|${reducerType}|NPS${largeNps}|NPS${smallNps}|SCH${schedule}`,
          componentType: 'REDUCER',
          reducerType,
          largeNps,
          smallNps,
          largeSchedule: schedule,
          smallSchedule: schedule,
          source: relativePath,
          sourceRowNumber,
          dataStatus,
          dimensions,
          weights,
          provenance: {
            standard: 'ASME B16.9',
            source: relativePath,
            datasetVersion: 'pipedata-db/2026.06.dbphase86',
            dataStatus,
            sourceRow: sourceRowNumber,
            notes: `Schedule ${schedule} ${reducerType.toLowerCase()} reducer from explicit row/column matrix cell.`
          }
        });
      }
    }
  });
  return dataRows;
}

function updateDbIndex(family, rowCount, subtypes = null) {
  const p = 'pipetools/data/db-index.json';
  const indexObj = readJson(p);
  const entry = indexObj.families.find(f => f.family === family);
  if (entry) {
    entry.rowCount = rowCount;
    if (subtypes) {
      entry.subtypes = subtypes;
    }
  }
  writeJson(p, indexObj);
  console.log(`Updated db-index.json for ${family}: rowCount = ${rowCount}`);
}

function updateLedgerPhase(family, phase) {
  const p = 'data/audit/source-expansion-ledger.json';
  const ledger = readJson(p);
  if (ledger.families && ledger.families[family]) {
    ledger.families[family].latestPromotionPhase = phase;
  }
  writeJson(p, ledger);
  console.log(`Updated source-expansion-ledger.json for ${family}: latestPromotionPhase = ${phase}`);
}

function updateSearchIndex(phase, modifiedFilesMap) {
  const searchIndexPath = 'data/indexes/component-search.index.json';
  const searchIndex = readJson(searchIndexPath);
  const pathsToRebuild = [
    'data/normalized/pipes.json',
    'data/normalized/reducers.json',
    'data/normalized/fittings.json',
    'data/normalized/pipes-expanded.json',
    'data/normalized/pipes-sch80-wave2.json',
    'data/normalized/pipes-sch80-wave3.json',
    'data/normalized/pipes-sch80-wave4.json',
    'data/normalized/reducers-expanded.json',
    'data/normalized/reducers-sch80-wave1.json',
    'data/normalized/reducers-sch80-wave2.json'
  ];
  const pathsToRemoveSet = new Set(pathsToRebuild);
  let entries = searchIndex.entries.filter(entry => !pathsToRemoveSet.has(entry.source));
  
  for (const [sourcePath, rows] of Object.entries(modifiedFilesMap)) {
    for (const row of rows) {
      let family = row.componentType;
      const entry = {
        id: row.id,
        family,
        filters: { componentType: family },
        source: sourcePath,
        dataStatus: row.dataStatus
      };
      if (family === 'PIPE') {
        entry.filters.nps = row.nps;
        entry.filters.schedule = row.schedule;
      } else if (family === 'REDUCER') {
        entry.reducerType = row.reducerType;
        entry.smallSchedule = row.smallSchedule;
        entry.filters.largeNps = row.largeNps;
        entry.filters.smallNps = row.smallNps;
        entry.filters.largeSchedule = row.largeSchedule;
      } else if (family === 'FITTING') {
        entry.filters.subtype = row.subtype;
        entry.filters.nps = row.nps;
        entry.filters.schedule = row.schedule;
      }
      entries.push(entry);
    }
  }

  for (const historicalPath of pathsToRebuild.slice(3)) {
    if (!fs.existsSync(historicalPath)) continue;
    const catalog = readJson(historicalPath);
    const rows = catalog.rows || [];
    for (const row of rows) {
      let family = row.componentType;
      const entry = {
        id: row.id,
        family,
        filters: { componentType: family },
        source: historicalPath,
        dataStatus: row.dataStatus
      };
      if (family === 'PIPE') {
        entry.filters.nps = row.nps;
        entry.filters.schedule = row.schedule;
      } else if (family === 'REDUCER') {
        entry.reducerType = row.reducerType;
        entry.smallSchedule = row.smallSchedule;
        entry.filters.largeNps = row.largeNps;
        entry.filters.smallNps = row.smallNps;
        entry.filters.largeSchedule = row.largeSchedule;
      } else if (family === 'FITTING') {
        entry.filters.subtype = row.subtype;
        entry.filters.nps = row.nps;
        entry.filters.schedule = row.schedule;
      }
      entries.push(entry);
    }
  }
  
  searchIndex.phase = phase;
  searchIndex.entries = entries;
  writeJson(searchIndexPath, searchIndex);
  console.log(`Regenerated component-search.index.json: total entries = ${entries.length}`);
}

function updateManifest(newPaths) {
  const p = 'data/exports/db-export-manifest.json';
  const manifest = readJson(p);
  const existingPaths = new Set(manifest.artifacts.map(a => a.path));
  
  for (const newPath of newPaths) {
    if (!existingPaths.has(newPath)) {
      let family = 'FITTING';
      if (newPath.includes('pipes')) family = 'PIPE';
      else if (newPath.includes('reducers')) family = 'REDUCER';
      manifest.artifacts.push({
        path: newPath,
        kind: 'NORMALIZED_DATA',
        family
      });
      console.log(`Added ${newPath} to db-export-manifest.json`);
    }
  }
  writeJson(p, manifest);
}

import { buildCoverageDashboard } from './src/db/coverageDashboard.js';
function updateCoverageDashboard() {
  const manifest = readJson('data/exports/db-export-manifest.json');
  const searchIndex = readJson('data/indexes/component-search.index.json');
  const catalogs = {};
  for (const art of manifest.artifacts) {
    if (art.kind === 'NORMALIZED_DATA') {
      catalogs[art.path] = readJson(art.path);
    }
  }
  const dashboard = buildCoverageDashboard({ manifest, searchIndex, catalogs });
  writeJson('data/audit/db-coverage-dashboard.json', dashboard);
  console.log('Regenerated db-coverage-dashboard.json');
}

function main() {
  // 1. PIPES (Phase 85)
  console.log('\n--- Running Phase 85: Pipe 100% Coverage ---');
  const pipeFiles = fs.readdirSync('docs/Pipedata/Database/Pipe')
    .filter(f => f.endsWith('.csv') && !f.includes('_Imperial_'));
  
  let allPipes = [];
  const pipeSourceFilesObj = {};
  for (const file of pipeFiles) {
    const csvPath = `docs/Pipedata/Database/Pipe/${file}`;
    const text = fs.readFileSync(csvPath, 'utf8');
    const schedule = file.replace(/^PIPE/i, '').replace(/\.csv$/i, '').toUpperCase();
    const relativePath = `Database/Pipe/${file}`;
    const parsed = parsePipeCsv(text, relativePath, schedule);
    allPipes.push(...parsed);
    pipeSourceFilesObj[relativePath] = parsed.length;
  }
  allPipes.sort((a, b) => a.id.localeCompare(b.id));

  const sourceReadyRows = allPipes.filter(r => r.dataStatus === 'READY').length;
  const sourcePartialRows = allPipes.filter(r => r.dataStatus === 'PARTIAL').length;

  const pipesJson = {
    schema: 'pipedata-normalized-pipes/v1',
    summary: {
      sourceRowCount: allPipes.length,
      sourceReadyRows,
      sourcePartialRows,
      sampledRowCount: allPipes.length,
      sourceFileCount: pipeFiles.length,
      sourceFolder: 'Database/Pipe',
      sourceArchiveSha256: 'c3e50452e10a05e6e84c1c089f46a9ef4b4e24a155b153036b9dcf1afeeae408',
      datasetVersion: 'pipedata-db/2026.06.dbphase85',
      generationMode: 'SOURCE_BACKED_PROMOTION',
      statusPolicy: 'Rows with N/A/SPA/blank numeric source cells remain PARTIAL with null values; blanks are never coerced to 0.',
      runtimeSeedPolicy: 'Existing runtime screening seeds remain separate; source-table values in this dataset are authoritative for DB phases.',
      expansionPack: 'DB_PHASE_85_PIPE_100_PROMOTION'
    },
    sourceFiles: pipeSourceFilesObj,
    rows: allPipes
  };
  writeJson('data/normalized/pipes.json', pipesJson);
  console.log(`Wrote data/normalized/pipes.json: ${allPipes.length} rows`);

  const pipeIndexByKeys = {};
  const pipeIndexReady = [];
  const pipeIndexPartial = [];
  allPipes.forEach((row, idx) => {
    pipeIndexByKeys[row.id] = idx;
    (row.dataStatus === 'READY' ? pipeIndexReady : pipeIndexPartial).push(row.id);
  });
  const pipeIndex = {
    schema: 'pipedata-pipe-index/v1',
    datasetVersion: 'pipedata-db/2026.06.dbphase85',
    sampledRowCount: allPipes.length,
    byKey: pipeIndexByKeys,
    readyKeys: pipeIndexReady,
    partialKeys: pipeIndexPartial,
    sourceFiles: pipeSourceFilesObj
  };
  writeJson('data/indexes/pipe.index.json', pipeIndex);
  console.log('Wrote data/indexes/pipe.index.json');
  updateDbIndex('PIPE', allPipes.length);
  updateLedgerPhase('PIPE', 'DB_PHASE_85');


  // 2. REDUCERS (Phase 86)
  console.log('\n--- Running Phase 86: Reducer 100% Coverage ---');
  const reducerFiles = fs.readdirSync('docs/Pipedata/Database/Ftbw')
    .filter(f => f.startsWith('Reducers') && f.endsWith('.csv') && !f.includes('_Imperial_'));
  
  let allReducers = [];
  const reducerSourceFilesObj = {};
  for (const file of reducerFiles) {
    const csvPath = `docs/Pipedata/Database/Ftbw/${file}`;
    const text = fs.readFileSync(csvPath, 'utf8');
    const schedule = file.replace(/^Reducers/i, '').replace(/\.csv$/i, '').toUpperCase();
    const relativePath = `docs/Pipedata/Database/Ftbw/${file}`;
    const parsed = parseReducerCsv(text, relativePath, schedule);
    allReducers.push(...parsed);
    reducerSourceFilesObj[relativePath] = parsed.length / 2;
  }
  allReducers.sort((a, b) => a.id.localeCompare(b.id));

  const reducersJson = {
    schema: 'pipedata-normalized-reducers/v1',
    summary: {
      family: 'REDUCER',
      sourceRoot: 'docs/Pipedata/Database/Ftbw',
      sourceFolder: 'Database/Ftbw',
      sourceFileCount: reducerFiles.length,
      sourceRowCount: allReducers.length / 2,
      sourceReadyRows: allReducers.filter(r => r.dataStatus === 'READY').length / 2,
      sourcePartialRows: allReducers.filter(r => r.dataStatus === 'PARTIAL').length / 2,
      sampledRowCount: allReducers.length,
      sourceStandard: 'ASME B16.9',
      datasetVersion: 'pipedata-db/2026.06.dbphase86',
      generationMode: 'SOURCE_BACKED_PROMOTION',
      sourceAvailability: 'All reducer rows are promoted from valid matrix cells in Reducers*.csv files.',
      expansionPack: 'DB_PHASE_86_REDUCER_100_PROMOTION'
    },
    sourceFiles: reducerSourceFilesObj,
    rows: allReducers
  };
  writeJson('data/normalized/reducers.json', reducersJson);
  console.log(`Wrote data/normalized/reducers.json: ${allReducers.length} rows`);

  const reducerIndexByKey = {};
  allReducers.forEach(row => {
    reducerIndexByKey[row.id] = row.id;
  });
  const reducerIndex = {
    metadata: {
      family: 'REDUCER',
      phase: 'DB_PHASE_86',
      source: 'data/normalized/reducers.json',
      keyFormat: 'REDUCER|{reducerType}|NPS{largeNps}|NPS{smallNps}|SCH{schedule}',
      rowCount: allReducers.length
    },
    byKey: reducerIndexByKey
  };
  writeJson('data/indexes/reducer.index.json', reducerIndex);
  console.log('Wrote data/indexes/reducer.index.json');
  updateLedgerPhase('REDUCER', 'DB_PHASE_86');


  // 3. FITTINGS (Phase 87)
  console.log('\n--- Running Phase 87: Fitting 100% Coverage ---');
  const fittingFiles = fs.readdirSync('docs/Pipedata/Database/Ftbw')
    .filter(f => f.endsWith('.csv') && !f.includes('_Imperial_') && (
      f.startsWith('Cap') ||
      f.startsWith('90Elbow') ||
      f.startsWith('45Elbow') ||
      f.startsWith('StraightTee') ||
      f.startsWith('ReducingTee')
    ));

  let allFittings = [];
  const fittingSourceFilesObj = {};
  for (const file of fittingFiles) {
    const csvPath = `docs/Pipedata/Database/Ftbw/${file}`;
    const text = fs.readFileSync(csvPath, 'utf8');
    const relativePath = `docs/Pipedata/Database/Ftbw/${file}`;
    let parsed = [];
    if (file.startsWith('ReducingTee')) {
      parsed = parseReducingTeeTable(text, { source: relativePath });
    } else {
      parsed = parseButtweldFittingTable(text, { source: relativePath });
    }
    allFittings.push(...parsed);
    fittingSourceFilesObj[relativePath] = parsed.length;
  }
  allFittings.sort((a, b) => a.id.localeCompare(b.id));

  const fittingsJson = {
    schema: 'pipedata-normalized-fittings/v1',
    metadata: {
      family: 'FITTING',
      phase: 'DB_PHASE_87',
      sourceRoot: 'docs/Pipedata/Database/Ftbw',
      generationMode: 'SOURCE_BACKED_PROMOTION',
      sourceFiles: fittingFiles.map(f => `docs/Pipedata/Database/Ftbw/${f}`),
      sourceStandard: 'ASME B16.9',
      sampledRowCount: allFittings.length,
      expansionPack: 'DB_PHASE_87_FITTING_100_PROMOTION'
    },
    rows: allFittings
  };
  writeJson('data/normalized/fittings.json', fittingsJson);
  console.log(`Wrote data/normalized/fittings.json: ${allFittings.length} rows`);

  const fittingIndexByKey = {};
  allFittings.forEach(row => {
    fittingIndexByKey[row.id] = row.id;
  });
  const fittingIndex = {
    metadata: {
      family: 'FITTING',
      phase: 'DB_PHASE_87',
      source: 'data/normalized/fittings.json',
      keyFormat: 'FITTING|{subtype}|NPS{nps}|SCH{schedule}|{unitSystem}',
      rowCount: allFittings.length
    },
    byKey: fittingIndexByKey
  };
  writeJson('data/indexes/fitting.index.json', fittingIndex);
  console.log('Wrote data/indexes/fitting.index.json');
  updateDbIndex('FITTING', allFittings.length, ['ELBOW_90', 'ELBOW_45', 'TEE_STRAIGHT', 'TEE_REDUCING', 'CAP']);
  updateLedgerPhase('FITTING', 'DB_PHASE_87');


  // 4. METADATA AND SEARCH INDEX REBUILD
  console.log('\n--- Running Rebuild and Coverage Dashboard Re-generation ---');
  updateManifest([
    'data/normalized/pipes.json',
    'data/normalized/reducers.json',
    'data/normalized/fittings.json'
  ]);
  
  updateSearchIndex('DB_PHASE_87', {
    'data/normalized/pipes.json': allPipes,
    'data/normalized/reducers.json': allReducers,
    'data/normalized/fittings.json': allFittings
  });
  
  updateCoverageDashboard();
  console.log('Rebuild completed successfully.');
}

main();
