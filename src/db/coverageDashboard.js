const SCHEMA = 'pipedata-db-coverage-dashboard/v1';
const PHASE = 'DB_PHASE_14';
const NORMALIZED = 'NORMALIZED_DATA';

export function buildCoverageDashboard({ manifest, searchIndex, catalogs } = {}) {
  const entries = Array.isArray(searchIndex?.entries) ? searchIndex.entries : [];
  const out = {
    schema: SCHEMA,
    phase: PHASE,
    generatedFrom: { exportManifestSchema: manifest?.schema ?? null, searchIndexSchema: searchIndex?.schema ?? null },
    policy: {
      noFabrication: true,
      noEngineeringFallback: true,
      missingValuesRemainNull: true,
      purpose: 'Coverage visibility only; this dashboard does not promote or synthesize engineering values.',
    },
    summary: emptySummary(entries.length),
    families: {},
    gaps: [],
    diagnostics: [],
  };
  for (const artifact of normalizedArtifacts(manifest)) {
    const catalog = catalogs?.[artifact.path] ?? catalogs?.[artifact.family];
    if (!catalog) {
      out.diagnostics.push({ code: 'COVERAGE_CATALOG_UNREADABLE', path: artifact.path, family: artifact.family });
      continue;
    }
    const family = artifact.family ?? inferFamily(catalog, artifact.path);
    const familyEntries = entries.filter((entry) => entry.source === artifact.path || entry.family === family);
    const coverage = summarizeFamily(family, artifact, catalog, familyEntries);
    out.families[family] = coverage;
    out.gaps.push(...coverage.gaps);
    mergeSummary(out.summary, coverage);
  }
  out.summary.familyCount = Object.keys(out.families).length;
  out.ok = out.diagnostics.length === 0;
  return out;
}

export function validateCoverageDashboard(dashboard) {
  const diagnostics = [];
  if (dashboard?.schema !== SCHEMA) diagnostics.push({ code: 'COVERAGE_SCHEMA_MISMATCH' });
  if (dashboard?.phase !== PHASE) diagnostics.push({ code: 'COVERAGE_PHASE_MISMATCH' });
  if (!dashboard?.summary) diagnostics.push({ code: 'COVERAGE_SUMMARY_REQUIRED' });
  if (!dashboard?.families || typeof dashboard.families !== 'object') diagnostics.push({ code: 'COVERAGE_FAMILIES_REQUIRED' });
  if (!Array.isArray(dashboard?.gaps)) diagnostics.push({ code: 'COVERAGE_GAPS_REQUIRED' });
  const missing = dashboard?.gaps?.filter((gap) => gap.code === 'INDEXED_ROW_MISSING_FROM_CATALOG').length ?? 0;
  if ((dashboard?.summary?.missingCatalogRows ?? 0) !== missing) diagnostics.push({ code: 'COVERAGE_MISSING_CATALOG_GAP_COUNT_MISMATCH' });
  return { ok: diagnostics.length === 0, diagnostics };
}

function normalizedArtifacts(manifest) {
  return (manifest?.artifacts ?? []).filter((artifact) => artifact.kind === NORMALIZED);
}

function emptySummary(indexedEntryCount) {
  return {
    familyCount: 0,
    indexedEntryCount,
    normalizedRowCount: 0,
    indexedResolvedRowCount: 0,
    missingCatalogRows: 0,
    readyRows: 0,
    partialRows: 0,
    missingDimensionRows: 0,
    projectOverrideRows: 0,
    unavailableFieldCount: 0,
    statusCounts: {},
    coverageStatusCounts: {},
    unsupportedOrConfigOnlyFamilyCount: 0,
  };
}

function summarizeFamily(family, artifact, catalog, entries) {
  const rows = Array.isArray(catalog.rows) ? catalog.rows : [];
  const rowIds = new Set(rows.map((row) => row.id));
  const gaps = entries
    .filter((entry) => !rowIds.has(entry.id))
    .map((entry) => ({ code: 'INDEXED_ROW_MISSING_FROM_CATALOG', family, id: entry.id, source: entry.source }));
  const statusCounts = countStatuses(rows);
  const values = countUnavailableValues(rows);
  const sourceCoverage = extractSourceCoverage(catalog);
  const coverageStatus = classifyCoverage(rows, statusCounts, gaps, sourceCoverage);
  return {
    family,
    path: artifact.path,
    schema: catalog.schema ?? null,
    generationMode: sourceCoverage.generationMode,
    coverageStatus,
    unsupportedOrConfigOnly: isUnsupportedOrConfigOnly(sourceCoverage.generationMode),
    indexedRows: entries.length,
    indexedResolvedRows: entries.length - gaps.length,
    missingCatalogRows: gaps.length,
    normalizedRows: rows.length,
    statusCounts,
    readyRows: statusCounts.READY ?? 0,
    partialRows: statusCounts.PARTIAL ?? 0,
    missingDimensionRows: statusCounts.MISSING_DIMENSION ?? 0,
    projectOverrideRows: statusCounts.PROJECT_OVERRIDE ?? 0,
    unavailableFieldCount: values.unavailableFieldCount,
    nullValueCount: values.nullValueCount,
    sourceCoverage,
    gaps,
  };
}

function countStatuses(rows) {
  const counts = {};
  for (const row of rows) {
    const status = row.dataStatus ?? row.provenance?.dataStatus ?? 'UNSPECIFIED';
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

function countUnavailableValues(rows) {
  const stats = { unavailableFieldCount: 0, nullValueCount: 0 };
  for (const row of rows) {
    for (const groupName of ['dimensions', 'weights', 'dimensionValues']) {
      for (const cell of Object.values(row[groupName] ?? {})) countCell(stats, cell);
    }
    for (const basis of Object.values(row.valueBasis ?? {})) countBasis(stats, basis);
  }
  return stats;
}

function countCell(stats, cell) {
  if (!cell || typeof cell !== 'object') return;
  if (cell.value === null) stats.nullValueCount += 1;
  countBasis(stats, cell.basis);
}

function countBasis(stats, basis) {
  if (basis === 'UNAVAILABLE') stats.unavailableFieldCount += 1;
}

function extractSourceCoverage(catalog) {
  const summary = catalog.summary ?? {};
  const metadata = catalog.metadata ?? {};
  const sourceFiles = catalog.sourceFiles ?? summary.sourceFiles ?? {};
  const availability = sourceAvailability(catalog.sourceAvailability);
  return {
    sourceFileCount: summary.sourceFileCount ?? metadata.sourceFileCount ?? metadata.sourceFiles?.length ?? fileCount(sourceFiles, availability),
    sourceRowCount: summary.sourceRowCount ?? summary.metricSourceRowCount ?? metadata.sourceTableRows ?? rowCount(sourceFiles),
    sourceReadyRows: summary.sourceReadyRows ?? null,
    sourcePartialRows: summary.sourcePartialRows ?? null,
    sampledRowCount: summary.sampledRowCount ?? metadata.sampledRowCount ?? null,
    explodedRowCount: summary.explodedRowCount ?? null,
    sourceFolders: metadata.sourceFolders ?? [summary.sourceFolder].filter(Boolean),
    sourceRoots: [...new Set([summary.sourceRoot, metadata.sourceRoot, ...(catalog.sourceRoots ?? [])].filter(Boolean))],
    generationMode: summary.generationMode ?? metadata.generationMode ?? catalog.generationMode ?? null,
    sourceAvailability: availability,
  };
}

function sourceAvailability(value = {}) {
  const totals = { groups: Object.keys(value).length, csvFiles: 0, dxfFiles: 0, setFiles: 0, fileCount: 0 };
  for (const group of Object.values(value)) {
    totals.csvFiles += group.csvFiles ?? 0;
    totals.dxfFiles += group.dxfFiles ?? 0;
    totals.setFiles += group.setFiles ?? 0;
  }
  totals.fileCount = totals.csvFiles + totals.dxfFiles + totals.setFiles;
  return totals;
}

function classifyCoverage(rows, statusCounts, gaps, sourceCoverage) {
  if (!rows.length) return 'MISSING';
  if (gaps.length) return 'INDEX_MISMATCH';
  if (statusCounts.MISSING_DIMENSION) return 'MISSING_DIMENSION';
  if (statusCounts.PROJECT_OVERRIDE) return 'PROJECT_OVERRIDE';
  if (statusCounts.PARTIAL) return 'PARTIAL';
  if (isSampleOnly(sourceCoverage)) return 'PARTIAL_SAMPLE';
  return 'READY';
}

function isSampleOnly({ sampledRowCount, sourceRowCount, explodedRowCount, generationMode }) {
  if (sampledRowCount && sourceRowCount && sampledRowCount < sourceRowCount) return true;
  if (sampledRowCount && explodedRowCount && sampledRowCount < explodedRowCount) return true;
  return /SAMPLE/.test(generationMode ?? '');
}
function isUnsupportedOrConfigOnly(generationMode) { return /(INVENTORY_SELECTOR|PROJECT_DEFAULT|SOURCE_AVAILABILITY)/.test(generationMode ?? ''); }
function inferFamily(catalog, path) { return catalog.metadata?.family ?? catalog.summary?.family ?? path.split('/').pop()?.replace('.json', '').toUpperCase(); }
function fileCount(sourceFiles, availability) { return Object.keys(sourceFiles).length || availability.fileCount; }
function rowCount(sourceFiles) {
  const values = Object.values(sourceFiles).filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}
function mergeSummary(summary, family) {
  for (const key of ['normalizedRows', 'indexedResolvedRows', 'missingCatalogRows', 'readyRows', 'partialRows', 'missingDimensionRows', 'projectOverrideRows', 'unavailableFieldCount']) {
    summary[key === 'normalizedRows' ? 'normalizedRowCount' : key] += family[key];
  }
  if (family.unsupportedOrConfigOnly) summary.unsupportedOrConfigOnlyFamilyCount += 1;
  for (const [key, value] of Object.entries(family.statusCounts)) summary.statusCounts[key] = (summary.statusCounts[key] ?? 0) + value;
  summary.coverageStatusCounts[family.coverageStatus] = (summary.coverageStatusCounts[family.coverageStatus] ?? 0) + 1;
}
