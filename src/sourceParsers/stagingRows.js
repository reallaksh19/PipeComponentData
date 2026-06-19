import {
  cleanSentinel,
  getParserPolicyForPath,
  inferClassFromFilename,
  inferUnitSystemFromFilename,
  isIgnoredColumn,
  loadParserPolicies,
  sourceFolder,
} from './parserPolicy.js';
import { splitCsvRows } from './csvCells.js';

export function parseSourceText(sourcePath, text, options = {}) {
  const policies = options.policies ?? loadParserPolicies(options.root ?? process.cwd());
  const policy = getParserPolicyForPath(sourcePath, policies);
  const diagnostics = [];
  if (!policy) return missingPolicy(sourcePath, text, diagnostics);
  const rows = splitCsvRows(text);
  const header = readHeader(rows, policy, diagnostics);
  const dataRows = rows.slice(Math.max(0, policy.headerPolicy.dataStartsAtRow - 1));
  return {
    sourceId: sourcePath,
    policy: summarizePolicy(policy, sourcePath, policies),
    columns: header.columns,
    rows: dataRows.map((cells, index) => makeRow(sourcePath, cells, header.columns, policy, policies, index)),
    ignoredColumns: header.ignoredColumns,
    diagnostics,
  };
}

function readHeader(rows, policy, diagnostics) {
  const headerRowIndex = Math.max(0, policy.headerPolicy.dataStartsAtRow - 2);
  const columns = (rows[headerRowIndex] ?? []).map((name, index) => ({ index, name: String(name).trim() }));
  if (policy.headerPolicy.columnCountCell) checkColumnCount(rows[0], columns, diagnostics);
  const ignoredColumns = columns.filter((column) => isIgnoredColumn(policy, column.index));
  return { columns, ignoredColumns };
}

function checkColumnCount(countRow, columns, diagnostics) {
  const declared = Number(countRow?.[0]);
  if (Number.isFinite(declared) && declared !== columns.length) {
    diagnostics.push({ severity: 'WARNING', code: 'COLUMN_COUNT_MISMATCH', declared, actual: columns.length });
  }
}

function makeRow(sourceId, cells, columns, policy, policies, index) {
  const raw = {};
  const indexed = [];
  const ignored = [];
  for (const column of columns) {
    const value = cleanSentinel(cells[column.index], policies);
    const item = { index: column.index, name: column.name, value };
    if (isIgnoredColumn(policy, column.index)) ignored.push(item);
    else {
      indexed.push(item);
      raw[uniqueKey(column.name, column.index, raw)] = value;
    }
  }
  return {
    sourceId,
    sourceRowNumber: policy.headerPolicy.dataStartsAtRow + index,
    raw,
    columns: indexed,
    ignoredColumns: ignored,
    inferred: summarizePolicy(policy, sourceId, policies),
    diagnostics: [],
  };
}

function summarizePolicy(policy, sourceId, policies) {
  return {
    sourceFolder: sourceFolder(sourceId),
    family: policy.family,
    subfamily: policy.subfamily,
    classRating: policy.filenamePolicy?.classFromFilename ? inferClassFromFilename(sourceId, policies) : null,
    unitSystem: policy.filenamePolicy?.unitFromFilename ? inferUnitSystemFromFilename(sourceId) : null,
    rowExplosionRequired: policy.rowExplosion?.required === true,
  };
}

function uniqueKey(name, index, raw) {
  const base = String(name || `column_${index + 1}`).trim() || `column_${index + 1}`;
  return Object.hasOwn(raw, base) ? `${base}@${index}` : base;
}

function missingPolicy(sourcePath, text, diagnostics) {
  diagnostics.push({ severity: 'ERROR', code: 'SOURCE_POLICY_MISSING', sourceId: sourcePath });
  return { sourceId: sourcePath, policy: null, columns: [], rows: [], ignoredColumns: [], diagnostics, rawText: text };
}
