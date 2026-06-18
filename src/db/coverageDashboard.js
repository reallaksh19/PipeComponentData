const SCHEMA = 'pipedata-db-coverage-dashboard/v1';
const PHASE = 'DB_PHASE_14';
const NORMALIZED = 'NORMALIZED_DATA';

const SUMMARY_KEYS = {
  normalizedRows: 'normalizedRowCount',
  indexedResolvedRows: 'indexedResolvedRowCount',
  missingCatalogRows: 'missingCatalogRows',
  readyRows: 'readyRows',
  partialRows: 'partialRows',
  missingDimensionRows: 'missingDimensionRows',
  projectOverrideRows: 'projectOverrideRows',
  unavailableFieldCount: 'unavailableFieldCount',
};

export function buildCoverageDashboard({ manifest, searchIndex, catalogs } = {}) {
  const entries = Array.isArray(searchIndex?.entries) ? searchIndex.entries : [];
  const dashboard = {
    schema: SCHEMA,
    phase: PHASE,
    generatedFrom: {
      exportManifestSchema: manifest?.schema ?? null,
      searchIndexSchema: searchIndex?.schema ?? null,
    },
    policy: {
      noFabrication: true,
      noEngineeringFallback: true,
      missingValuesRemainNull: true,
      purpose: 'Coverage visibility only; no engineering values are promoted by this dashboard.',
    },
    summary: emptySummary(entries.length),
    families: {},
    gaps: [],
    diagnostics: [],
  };

  for (const artifact of normalizedArtifacts(manifest)) {
    const catalog = catalogs?.[artifact.path] ?? catalogs?.[artifact.family];
    if (!catalog) {
      dashboard.diagnostics.push({ code: 'COVERAGE_CATALOG_UNREADABLE', path: artifact.path, family: artifact.family });
      continue;
    }

    const family = artifact.family ?? inferFamily(catalog, artifact.path);
    const artifactEntries = entries.filter((entry) => entry.source === artifact.path);
    const coverage = summarizeFamily(family, artifact, catalog, artifactEntries);
    dashboard.families[family] = dashboard.families[family] ? mergeFamilyCoverage(dashboard.families[family], coverage) : coverage;
    dashboard.gaps.push(...coverage.gaps);
    mergeSummary(dashboard.summary, coverage);
  }

  dashboard.summary.familyCount = Object.keys(dashboard.families).length;
  dashboard.ok = dashboard.diagnostics.length === 0;
  return dashboard;
}

export function validateCoverageDashboard(dashboard) {
  const diagnostics = [];
  if (dashboard?.schema !== SCHEMA) diagnostics.push({ code: 'COVERAGE_SCHEMA_MISMATCH' });
  if (dashboard?.phase !== PHASE) diagnostics.push({ code: 'COVERAGE_PHASE_MISMATCH' });
  if (!dashboard?.summary) diagnostics.push({ code: 'COVERAGE_SUMMARY_REQUIRED' });
  if (!dashboard?.families || typeof dashboard.families !== 'object') diagnostics.push({ code: 'COVERAGE_FAMILIES_REQUIRED' });
  if (!Array.isArray(dashboard?.gaps)) diagnostics.push({ code: 'COVERAGE_GAPS_REQUIRED' });

  const missing = dashboard?.gaps?.filter((gap) => gap.code === 'INDEXED_ROW_MISSING_FROM_CATALOG').length ?? 0;
  if ((dashboard?.summary?.missingCatalogRows ?? 0) !== missing) {
    diagnostics.push({ code: 'COVERAGE_MISSING_CATALOG_GAP_COUNT_MISMATCH' });
  }
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
  const valueStats = countUnavailableValues(rows);
  const sourceCoverage = extractSourceCoverage(catalog);

  return {
    family,
    path: artifact.path,
    schema: catalog.schema ?? null,
    generationMode: sourceCoverage.generationMode,
    coverageStatus: classifyCoverage(rows, statusCounts, gaps, sourceCoverage),
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
    unavailableFieldCount: valueStats.unavailableFieldCount,
    nullValueCount: valueStats.nullValueCount,
    sourceCoverage,
    gaps,
  };
}

function mergeFamilyCoverage(left, right) {
  const merged = {
    ...left,
    path: joinUnique([left.path, right.path]),
    normalizedRows: left.normalizedRows + right.normalizedRows,
    indexedRows: left.indexedRows + right.indexedRows,
    indexedResolvedRows: left.indexedResolvedRows + right.indexedResolvedRows,
    missingCatalogRows: left.missingCatalogRows + right.missingCatalogRows,
    readyRows: left.readyRows + right.readyRows,
    partialRows: left.partialRows + right.partialRows,
    missingDimensionRows: left.missingDimensionRows + right.missingDimensionRows,
    projectOverrideRows: left.projectOverrideRows + right.projectOverrideRows,
    unavailableFieldCount: left.unavailableFieldCount + right.unavailableFieldCount,
    nullValueCount: left.nullValueCount + right.nullValueCount,
    statusCounts: mergeCounts(left.statusCounts, right.statusCounts),
    sourceCoverage: mergeSourceCoverage(left.sourceCoverage, right.sourceCoverage),
    gaps: [...left.gaps, ...right.gaps],
    unsupportedOrConfigOnly: left.unsupportedOrConfigOnly || right.unsupportedOrConfigOnly,
  };
  merged.generationMode = joinUnique([left.generationMode, right.generationMode]).join('+');
  merged.coverageStatus = combineCoverageStatus([left.coverageStatus, right.coverageStatus]);
  return merged;
}

function mergeSourceCoverage(left = {}, right = {}) {
  return {
    sourceFileCount: (left.sourceFileCount ?? 0) + (right.sourceFileCount ?? 0),
    sourceRowCount: sumNullable(left.sourceRowCount, right.sourceRowCount),
    sourceReadyRows: sumNullable(left.sourceReadyRows, right.sourceReadyRows),
    sourcePartialRows: sumNullable(left.sourcePartialRows, right.sourcePartialRows),
    sampledRowCount: sumNullable(left.sampledRowCount, right.sampledRowCount),
    explodedRowCount: sumNullable(left.explodedRowCount, right.explodedRowCount),
    sourceFolders: joinUnique([...(left.sourceFolders ?? []), ...(right.sourceFolders ?? [])]),
    sourceRoots: joinUnique([...(left.sourceRoots ?? []), ...(right.sourceRoots ?? [])]),
    generationMode: joinUnique([left.generationMode, right.generationMode]).join('+'),
    sourceAvailability: {
      groups: (left.sourceAvailability?.groups ?? 0) + (right.sourceAvailability?.groups ?? 0),
      csvFiles: (left.sourceAvailability?.csvFiles ?? 0) + (right.sourceAvailability?.csvFiles ?? 0),
      dxfFiles: (left.sourceAvailability?.dxfFiles ?? 0) + (right.sourceAvailability?.dxfFiles ?? 0),
      setFiles: (left.sourceAvailability?.setFiles ?? 0) + (right.sourceAvailability?.setFiles ?? 0),
      fileCount: (left.sourceAvailability?.fileCount ?? 0) + (right.sourceAvailability?.fileCount ?? 0),
    },
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
    sourceFileCount: summary.sourceFileCount ?? summary.metricSourceFileCount ?? metadata.sourceFileCount ?? metadata.sourceFiles?.length ?? fileCount(sourceFiles, availability),
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

function combineCoverageStatus(statuses) {
  for (const status of ['INDEX_MISMATCH', 'MISSING_DIMENSION', 'PROJECT_OVERRIDE', 'PARTIAL']) if (statuses.includes(status)) return status;
  if (statuses.includes('PARTIAL_SAMPLE')) return 'PARTIAL_SAMPLE';
  if (statuses.includes('MISSING')) return 'MISSING';
  return 'READY';
}

function isSampleOnly({ sampledRowCount, sourceRowCount, explodedRowCount, generationMode }) {
  if (sampledRowCount && sourceRowCount && sampledRowCount < sourceRowCount) return true;
  if (sampledRowCount && explodedRowCount && sampledRowCount < explodedRowCount) return true;
  return /SAMPLE/.test(generationMode ?? '');
}

function isUnsupportedOrConfigOnly(generationMode) {
  return /(INVENTORY_SELECTOR|PROJECT_DEFAULT|SOURCE_AVAILABILITY)/.test(generationMode ?? '');
}

function inferFamily(catalog, path) {
  return catalog.metadata?.family ?? catalog.summary?.family ?? path.split('/').pop()?.replace('.json', '').toUpperCase();
}

function fileCount(sourceFiles, availability) {
  return Object.keys(sourceFiles).length || availability.fileCount;
}

function rowCount(sourceFiles) {
  const values = Object.values(sourceFiles).filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}

function mergeSummary(summary, family) {
  for (const [familyKey, summaryKey] of Object.entries(SUMMARY_KEYS)) {
    summary[summaryKey] += family[familyKey] ?? 0;
  }
  if (family.unsupportedOrConfigOnly) summary.unsupportedOrConfigOnlyFamilyCount += 1;
  for (const [key, value] of Object.entries(family.statusCounts)) {
    summary.statusCounts[key] = (summary.statusCounts[key] ?? 0) + value;
  }
  summary.coverageStatusCounts[family.coverageStatus] = (summary.coverageStatusCounts[family.coverageStatus] ?? 0) + 1;
}

function mergeCounts(a = {}, b = {}) {
  const merged = { ...a };
  for (const [key, value] of Object.entries(b)) merged[key] = (merged[key] ?? 0) + value;
  return merged;
}

function joinUnique(values) {
  return [...new Set(values.flat().filter(Boolean))];
}

function sumNullable(a, b) {
  const values = [a, b].filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}
