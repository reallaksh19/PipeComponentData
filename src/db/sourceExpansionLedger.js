const SCHEMA = 'pipedata-source-expansion-ledger/v1';
const ALLOWED_LEDGER_PHASES = new Set(['DB_PHASE_23', 'DB_PHASE_28']);

export const EXPANSION_STATUS = Object.freeze({
  READY_FOR_PROMOTION: 'READY_FOR_PROMOTION',
  PARTIAL_SOURCE: 'PARTIAL_SOURCE',
  BLOCKED_SOURCE_MISSING: 'BLOCKED_SOURCE_MISSING',
  SKETCH_ONLY: 'SKETCH_ONLY',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
});

const REQUIRED_FAMILIES = ['PIPE', 'FLANGE', 'VALVE', 'FITTING', 'GASKET', 'SUPPORT', 'OLET', 'REDUCER'];

export function validateSourceExpansionLedger(ledger) {
  const diagnostics = [];
  if (ledger?.schema !== SCHEMA) diagnostics.push({ code: 'LEDGER_SCHEMA_MISMATCH' });
  if (!ALLOWED_LEDGER_PHASES.has(ledger?.phase)) diagnostics.push({ code: 'LEDGER_PHASE_MISMATCH', phase: ledger?.phase });
  if (ledger?.policy?.sourceBackedPromotionOnly !== true) diagnostics.push({ code: 'SOURCE_BACKED_POLICY_REQUIRED' });
  if (ledger?.policy?.noFabricatedEngineeringValues !== true) diagnostics.push({ code: 'NO_FABRICATION_POLICY_REQUIRED' });
  if (ledger?.policy?.noNearestEngineeringFallback !== true) diagnostics.push({ code: 'NO_FALLBACK_POLICY_REQUIRED' });

  const statuses = new Set(Object.values(EXPANSION_STATUS));
  const families = ledger?.families ?? {};
  for (const family of REQUIRED_FAMILIES) {
    const entry = families[family];
    if (!entry) {
      diagnostics.push({ code: 'LEDGER_FAMILY_MISSING', family });
      continue;
    }
    if (!statuses.has(entry.status)) diagnostics.push({ code: 'LEDGER_STATUS_INVALID', family, status: entry.status });
    if (entry.productionComplete === true) diagnostics.push({ code: 'PRODUCTION_COMPLETE_NOT_ALLOWED', family });
    if (entry.candidate === true && !Array.isArray(entry.sourceEvidence)) {
      diagnostics.push({ code: 'SOURCE_EVIDENCE_REQUIRED', family });
    }
  }

  return { ok: diagnostics.length === 0, diagnostics };
}

export function familiesByExpansionStatus(ledger, status) {
  return Object.entries(ledger?.families ?? {})
    .filter(([, entry]) => entry.status === status)
    .map(([family]) => family)
    .sort();
}

export function promotionCandidates(ledger) {
  return Object.entries(ledger?.families ?? {})
    .filter(([, entry]) => entry.candidate === true)
    .map(([family, entry]) => ({ family, phase: entry.promotionPhase, status: entry.status }));
}
