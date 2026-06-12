const DASHBOARD_SCHEMA = 'pipedata-db-coverage-dashboard/v1';
const PHASE = 'DB_PHASE_14';
const NORMALIZED_KIND = 'NORMALIZED_DATA';

export function buildCoverageDashboard({ manifest, searchIndex, catalogs } = {}) {
  const artifacts = normalizedArtifacts(manifest);
  const entries = Array.isArray(searchIndex?.entries) ? searchIndex.entries : [];
  const dashboard = {
    schema: DASHBOARD_SCHEMA,
    phase: PHASE,
    generatedFrom: {
      exportManifestSchema: manifest?.schema ?? null,
      searchIndexSchema: searchIndex?.schema ?? null,
    },
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

  for (const artifact of artifacts) {
    const catalog = catalogs?.[artifact.path] ?? catalogs?.[artifact.family];
    if (!catalog) {
      dashboard.diagnostics.push({ code: 'COVERAGE_CATALOG_UNREADABLE', path: artifact.path, family: artifact.family });
      continue;
    }
    const family = artifact.family ?? inferFamily(catalog, artifact.path);
    const familyEntries = entries.filter((entry) => entry.source === artifact.path || entry.family === family);
    const coverage = summarizeFamily({ family, artifact, catalog, entries: familyEntries });
    dashboard.families[family] = coverage;
    mergeSummary(dashboard.summary, coverage);
    dashboard.gaps.push(...coverage.gaps);
  }

  dashboard.summary.familyCount = Object.keys(dashboard.families).length;
  dashboard.ok = dashboard.diagnostics.length === 0;
  return dashboard;
}

export function validateCoverageDashboard(dashboard) {
  const diagnostics = [];
  if (dashboard?.schema !== DASHBOARD_SCHEMA) diagnostics.push({ code: 'COVERAGE_SCHEMA_MISMATCH' });
  if (dashboard?.phase !== PHASE) diagnostics.push({ code: 'COVERAGE_PHASE_MISMATCH' });
  if (!dashboard?.summary) diagnostics.push({ code: 'COVERAGE_SUMMARY_REQUIRED' });
  if (!dashboard?.families || typeof dashboard.families !== 'object') diagnostics.push({ code: 'COVERAGE_FAMILIES_REQUIRED' });
  if (!Array.isArray(dashboard?.gaps)) diagnostics.push({ code: 'COVERAGE_GAPS_REQUIRED' });
  const missingGapCount = dashboard?.gaps?.filter((gap) => gap.code === 'INDEXED_ROW_MISSING_FROM_CATALOG').length ?? 0;
  if ((dashboard?.summary?.missingCatalogRows ?? 0) !== missingGapCount) {
    diagnostics.push({ code: 'COVERAGE_MISSING_CATALOG_GAP_COUNT_MISMATCH' });
  }
  return { ok: diagnostics.length === 0, diagnostics };
}

function normalizedArtifacts(manifest) {
  return (manifest?.artifacts ?? []).filter((artifact) => artifact.kind === NORMALIZED_KIND);
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

function summarizeFamily({ family, artifact, catalog, entries }) {
  const rows = Array.isArray(catalog.rows) ? catalog.rows : [];
  const rowIds = new Set(rows.map((row) => row.id));
  const gaps = entries
    .filter((entry) => !rowIds.has(entry.id))
    .map((entry) => ({ code: 'INDEXED_ROW_MISSING_FROM_CATALOG', family, id: entry.id, source: entry.source }));
  const statusCounts = countStatuses(rows);
  const valueStats = collectRowsValueStats(rows);
  const sourceCoverage = extractSourceCoverage(catalog);
  const coverageStatus = classifyCoverage({ statusCounts, gaps, sourceCoverage, rows });
  const unsupportedOrConfigOnly = isUnsupportedOrConfigOnly(sourceCoverage.generationMode);

  return {
    family,
    path: artifact.path,
    schema: catalog.schema ?? null,
    generationMode: sourceCoverage.generationMode,
    coverageStatus,
    unsupportedOrConfigOnly,
    indexedRows: entries.length,
    indexedResolvedRows: entries.length - gaps.length,
    missingCatalogRows: gaps.length,
    normalizedRows: rows.length,
    statusCounts,
    readyRows: statusCounts.READY ?? 0,
    partialRows: statusCounts.PARTIAL ?? 0,
    missingDimensionRows: statusCounts.MISSING_DIMENSION ?? 0,
    projectOverrideRows: statusCounts.PROJECT_OVERRIDE ?? 0,
    unavailableFieldCount: valueStats.unavailableFieldCount,
    nullValueCount: valueStats.nullValueCount,
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

function collectRowsValueStats(rows) {
  return rows.reduce((total, row) => mergeValueStats(total, collectRowValueStats(row)), emptyValueStats());
}

function collectRowValueStats(row) {
  const stats = emptyValueStats();
  for (const groupName of ['dimensions', 'weights', 'dimensionValues']) {
    const group = row[groupName] ?? {};
    for (const value of Object.values(group)) addValueBasis(stats, value);
  }
  for (const basis of Object.values(row.valueBasis ?? {})) addBasis(stats, basis);
  return stats;
}

function emptyValueStats() {
  return { valueFieldCount: 0, nullValueCount: 0, unavailableFieldCount: 0, sourceValueCount: 0, derivedValueCount: 0, projectDefaultCount: 0 };
}

function addValueBasis(stats, cell) {
  if (!cell || typeof cell !== 'object') return;
  if ('value' in cell) {
    stats.valueFieldCount += 1;
    if (cell.value === null) stats.nullValueCount += 1;
  }
  addBasis(stats, cell.basis);
}

function addBasis(stats, basis) {
  if (basis === 'UNAVAILABLE') stats.unavailableFieldCount += 1;
  if (basis === 'SOURCE_VALUE') stats.sourceValueCount += 1;
  if (basis === 'DERIVED_VALUE') stats.derivedValueCount += 1;
  if (basis === 'PROJECT_DEFAULT') stats.projectDefaultCount += 1;
}

function mergeValueStats(left, right) {
  for (const key of Object.keys(left)) left[key] += right[key] ?? 0;
  return left;
}

function extractSourceCoverage(catalog) {
  const summary = catalog.summary ?? {};
  const metadata = catalog.metadata ?? {};
  const sourceFiles = catalog.sourceFiles ?? summary.sourceFiles ?? {};
  const sourceFileRows = Object.values(sourceFiles).filter((value) => Number.isFinite(value));
  const sourceAvailability = summarizeSourceAvailability(catalog.sourceAvailability);
  return {
    sourceFileCount: summary.sourceFileCount ?? metadata.sourceFileCount ?? metadata.sourceFiles?.length ?? Object.keys(sourceFiles).length ?? sourceAvailability.fileCount,
    sourceRowCount: summary.sourceRowCount ?? summary.metricSourceRowCount ?? metadata.sourceTableRows ?? sum(sourceFileRows) ?? null,
    sourceReadyRows: summary.sourceReadyRows ?? null,
    sourcePartialRows: summary.sourcePartialRows ?? null,
    sampledRowCount: summary.sampledRowCount ?? metadata.sampledRowCount ?? null,
    explodedRowCount: summary.explodedRowCount ?? null,
    sourceFolders: metadata.sourceFolders ?? [summary.sourceFolder].filter(Boolean),
    sourceRoots: [...new Set([summary.sourceRoot, metadata.sourceRoot, ...(catalog.sourceRoots ?? [])].filter(Boolean))],
    generationMode: summary.generationMode ?? metadata.generationMode ?? catalog.generationMode ?? null,
    sourceAvailability,
  };
}

function summarizeSourceAvailability(sourceAvailability = {}) {
  const totals = { groups: Object.keys(sourceAvailability).length, csvFiles: 0, dxfFiles: 0, setFiles: 0, fileCount: 0 };
  for (const group of Object.values(sourceAvailability)) {
    totals.csvFiles += group.csvFiles ?? 0;
    totals.dxfFiles += group.dxfFiles ?? 0;
    totals.setFiles += group.setFiles ?? 0;
  }
  totals.fileCount = totals.csvFiles + totals.dxfFiles + totals.setFiles;
  return totals;
}

function classifyCoverage({ statusCounts, gaps, sourceCoverage, rows }) {
  if (!rows.length) return 'MISSING';
  if (gaps.length) return 'INDEX_MISMATCH';
  if (statusCounts.MISSING_DIMENSION) return 'MISSING_DIMENSION';
  if (statusCounts.PROJECT_OVERRIDE) return 'PROJECT_OVERRIDE';
  if (statusCounts.PARTIAL) return 'PARTIAL';
  if (isSampleOnly(sourceCoverage)) return 'PARTIAL_SAMPLE';
  return 'READY';
}

function isSampleOnly(sourceCoverage) {
  const { sampledRowCount, sourceRowCount, explodedRowCount, generationMode } = sourceCoverage;
  if (sampledRowCount && sourceRowCount && sampledRowCount < sourceRowCount) return true;
  if (sampledRowCount && explodedRowCount && sampledRowCount < explodedRowCount) return true;
  return /SAMPLE/.test(generationMode ?? '');
}

function isUnsupportedOrConfigOnly(generationMode) {
  return /(INVENTORY_SELECTOR|PROJECT_DEFAULT|SOURCE_AVAILABILITY)/.test(generationMode ?? '');
}

function mergeSummary(summary, family) {
  summary.normalizedRowCount += family.normalizedRows;
  summary.indexedResolvedRowCount += family.indexedResolvedRows;
  summary.missingCatalogRows += family.missingCatalogRows;
  summary.readyRows += family.readyRows;
  summary.partialRows += family.partialRows;
  summary.missingDimensionRows += family.missingDimensionRows;
  summary.projectOverrideRows += family.projectOverrideRows;
  summary.unavailableFieldCount += family.unavailableFieldCount;
  if (family.unsupportedOrConfigOnly) summary.unsupportedOrConfigOnlyFamilyCount += 1;
  mergeCounts(summary.statusCounts, family.statusCounts);
  summary.coverageStatusCounts[family.coverageStatus] = (summary.coverageStatusCounts[family.coverageStatus] ?? 0) + 1;
}

function mergeCounts(target, source) {
  for (const [key, value] of Object.entries(source)) target[key] = (target[key] ?? 0) + value;
}

function inferFamily(catalog, path) {
  return catalog.metadata?.family ?? catalog.summary?.family ?? path.split('/').pop()?.replace('.json', '').toUpperCase();
}

function sum(values) {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0);
}
