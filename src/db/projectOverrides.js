export const OVERRIDE_CONFLICT_POLICY = Object.freeze({
  REQUIRE_EXPLICIT_PROJECT_OVERRIDE: 'REQUIRE_EXPLICIT_PROJECT_OVERRIDE',
});

export function overrideKey(row) {
  return [row.targetId, row.fieldPath, row.overrideScope].join('|');
}

export function buildOverrideIndex(overridePack) {
  const entries = Array.isArray(overridePack?.overrides) ? overridePack.overrides : [];
  const map = new Map();
  const duplicates = [];
  for (const row of entries) {
    const key = overrideKey(row);
    if (map.has(key)) duplicates.push(key);
    map.set(key, row);
  }
  return { map, duplicates };
}

export function validateOverridePack(overridePack) {
  const entries = Array.isArray(overridePack?.overrides) ? overridePack.overrides : [];
  const index = buildOverrideIndex(overridePack);
  const diagnostics = [];
  for (const duplicate of index.duplicates) diagnostics.push({ code: 'OVERRIDE_DUPLICATE', key: duplicate });
  for (const row of entries) {
    if (row.dataStatus !== 'PROJECT_OVERRIDE') diagnostics.push({ code: 'OVERRIDE_STATUS_REQUIRED', id: row.id });
    if (!row.targetId || !row.fieldPath) diagnostics.push({ code: 'OVERRIDE_TARGET_REQUIRED', id: row.id });
    if (!row.provenance?.standard || !row.provenance?.source || !row.provenance?.datasetVersion) {
      diagnostics.push({ code: 'OVERRIDE_PROVENANCE_REQUIRED', id: row.id });
    }
    if (row.provenance?.dataStatus !== 'PROJECT_OVERRIDE') {
      diagnostics.push({ code: 'OVERRIDE_PROVENANCE_STATUS_REQUIRED', id: row.id });
    }
    if (!Object.prototype.hasOwnProperty.call(row, 'overrideValue')) {
      diagnostics.push({ code: 'OVERRIDE_VALUE_REQUIRED', id: row.id });
    }
  }
  return { ok: diagnostics.length === 0, diagnostics, index };
}

export function applyOverrides(baseRows, overridePack, options = {}) {
  const policy = options.policy ?? OVERRIDE_CONFLICT_POLICY.REQUIRE_EXPLICIT_PROJECT_OVERRIDE;
  const rows = Array.isArray(baseRows) ? baseRows : [];
  const entries = Array.isArray(overridePack?.overrides) ? overridePack.overrides : [];
  const byId = new Map(rows.map((row) => [row.id, structuredClone(row)]));
  const diagnostics = [];
  const applied = [];
  for (const override of entries) {
    const target = byId.get(override.targetId);
    if (!target) {
      diagnostics.push({ code: 'OVERRIDE_TARGET_MISSING', id: override.id, targetId: override.targetId });
      continue;
    }
    if (override.conflictPolicy !== policy) {
      diagnostics.push({ code: 'OVERRIDE_POLICY_MISMATCH', id: override.id });
      continue;
    }
    setPath(target, override.fieldPath, {
      value: override.overrideValue,
      basis: 'PROJECT_OVERRIDE',
      sourceValue: override.sourceValue ?? null,
      reason: override.reason,
      provenance: override.provenance,
    });
    target.overrideStatus = 'HAS_PROJECT_OVERRIDE';
    applied.push(override.id);
  }
  return { rows: [...byId.values()], applied, diagnostics, ok: diagnostics.length === 0 };
}

export function setPath(target, path, value) {
  const parts = String(path).split('.').filter(Boolean);
  let cursor = target;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
  cursor[parts.at(-1)] = value;
}
