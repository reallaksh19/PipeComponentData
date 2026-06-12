export interface NormalizedSourceValue<T = number | string | null> {
  value: T;
  basis?: string;
  source?: string | null;
  note?: string | null;
  [key: string]: unknown;
}

export interface NormalizedCatalogRow {
  id: string;
  standard?: string | null;
  source?: string | null;
  datasetVersion?: string | null;
  dataStatus?: string | null;
  sourceRow?: number | null;
  sourceRowNumber?: number | null;
  dimensions?: Record<string, NormalizedSourceValue>;
  weights?: Record<string, NormalizedSourceValue>;
  provenance?: LookupProvenance;
  [key: string]: unknown;
}

export interface ComponentSearchEntry {
  id: string;
  family: string;
  source: string;
  dataStatus?: string | null;
  aliases?: string[];
  filters?: Record<string, string | number | null | undefined>;
  [key: string]: unknown;
}

export interface ComponentSearchIndex {
  entries: ComponentSearchEntry[];
  noFallbackPolicy?: string | null;
  [key: string]: unknown;
}

export type CatalogRows = NormalizedCatalogRow[] | { rows?: NormalizedCatalogRow[] };

export interface LookupAssets {
  searchIndex?: ComponentSearchIndex;
  index?: ComponentSearchIndex;
  aliases?: unknown[];
  catalogs?: Record<string, CatalogRows> | Map<string, CatalogRows>;
}

export interface LookupOptions {
  filters?: Record<string, string | number | null | undefined>;
}

export interface LookupProvenance {
  standard?: string | null;
  source?: string | null;
  datasetVersion?: string | null;
  dataStatus?: string | null;
  sourceRowNumber?: number | null;
  [key: string]: unknown;
}

export interface LookupAudit {
  id: string;
  family: string;
  indexSource: string;
  source?: string | null;
  datasetVersion?: string | null;
  dataStatus?: string | null;
  sourceRowNumber?: number | null;
}

export interface LookupDiagnostic {
  code: string;
  message?: string;
  id?: string;
  source?: string;
  [key: string]: unknown;
}

export interface LookupResultBase {
  ok: boolean;
  status: LookupStatus;
  mode: string;
  id: string | null;
  entry: ComponentSearchEntry | null;
  row: NormalizedCatalogRow | null;
  diagnostics: LookupDiagnostic[];
  noFallbackPolicy: string | null;
}

export interface LookupFoundResult extends LookupResultBase {
  ok: true;
  status: 'FOUND';
  id: string;
  family: string;
  dataStatus: string | null;
  entry: ComponentSearchEntry;
  row: NormalizedCatalogRow;
  provenance: LookupProvenance;
  audit: LookupAudit;
}

export interface LookupMissResult extends LookupResultBase {
  ok: false;
  status: Exclude<LookupStatus, 'FOUND'>;
}

export type LookupResult = LookupFoundResult | LookupMissResult;

export const LOOKUP_STATUS: Readonly<{
  FOUND: 'FOUND';
  NO_EXACT_MATCH: 'NO_EXACT_MATCH';
  CATALOG_ROW_MISSING: 'CATALOG_ROW_MISSING';
  INVALID_ASSETS: 'INVALID_ASSETS';
}>;
export type LookupStatus = (typeof LOOKUP_STATUS)[keyof typeof LOOKUP_STATUS];
export function lookupComponentExact(query: string, assets?: LookupAssets, options?: LookupOptions): LookupResult;

export const ADAPTER_GRAPH_KEYS: unknown;
export const PHASE4_DATASETS: unknown;
export const REQUIRED_PROVENANCE_FIELDS: readonly string[];
export const COMPONENT_STUDIO_SCHEMA: string;
export const VALUE_BASIS: unknown;
export const NORMALIZATION_DATASET_VERSION: string;

export function createAdapterGraph(...args: unknown[]): unknown;
export function patchComponent(...args: unknown[]): unknown;
export function addGraphDiagnostic(...args: unknown[]): unknown;
export function selectComponentById(...args: unknown[]): unknown;
export function createGraphHistory(...args: unknown[]): unknown;
export function commitGraph(...args: unknown[]): unknown;
export function undoGraph(...args: unknown[]): unknown;
export function redoGraph(...args: unknown[]): unknown;
export function createPipingGraphSlice(...args: unknown[]): unknown;
export function assertExactGraphKeySet(...args: unknown[]): unknown;
export function assertJsonSerializable(...args: unknown[]): unknown;
export function assertUniversalInvariants(...args: unknown[]): unknown;
export function fromCsv(...args: unknown[]): unknown;
export function fromRawText(...args: unknown[]): unknown;
export function fromUxmlXml(...args: unknown[]): unknown;
export function classifyComponent(...args: unknown[]): unknown;
export function toUxmlXml(...args: unknown[]): unknown;
export function namespaceImportedIds(...args: unknown[]): unknown;
export function createPipeDataDb(...args: unknown[]): unknown;
export function listDatasetRows(...args: unknown[]): unknown;
export function rowProvenance(...args: unknown[]): unknown;
export function validateDatasetProvenance(...args: unknown[]): unknown;
export function enrichWithPipeData(...args: unknown[]): unknown;
export function resolveConnectivity(...args: unknown[]): unknown;
export function toCeg(...args: unknown[]): unknown;
export function fromCeg(...args: unknown[]): unknown;
export function toCanonicalGeometry(...args: unknown[]): unknown;
export function toSolid3dSpecs(...args: unknown[]): unknown;
export function assertNoInvalidSpecNumbers(...args: unknown[]): unknown;
export function toSemanticDxf(...args: unknown[]): unknown;
export function fromSemanticDxf(...args: unknown[]): unknown;
export function createWorkbenchModel(...args: unknown[]): unknown;
export function createComponentStudioModel(...args: unknown[]): unknown;
export function sourceValue(...args: unknown[]): unknown;
export function numericSource(...args: unknown[]): unknown;
export function derivedValue(...args: unknown[]): unknown;
export function unavailable(...args: unknown[]): unknown;
export function toFiniteNumber(...args: unknown[]): unknown;
export function makeNormalizedRow(...args: unknown[]): unknown;
export function validateNormalizedRow(...args: unknown[]): unknown;
export function collectTaggedValues(...args: unknown[]): unknown;
export function normalizeStagingRow(...args: unknown[]): unknown;
export function normalizeStagingRows(...args: unknown[]): unknown;
export function valveKey(...args: unknown[]): unknown;
export function parseValveTable(...args: unknown[]): unknown;
export function buildValveIndex(...args: unknown[]): unknown;
export function lookupValveRecord(...args: unknown[]): unknown;
