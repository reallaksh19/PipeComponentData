import { createHash } from 'node:crypto';

export function sha256Text(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}

export function summarizeJsonArtifact(path, json) {
  const rows = json.rows ?? json.entries ?? json.overrides ?? [];
  const statuses = {};
  for (const row of rows) {
    const status = row.dataStatus ?? row.provenance?.dataStatus ?? 'UNSPECIFIED';
    statuses[status] = (statuses[status] ?? 0) + 1;
  }
  return {
    path,
    schema: json.schema ?? null,
    phase: json.phase ?? null,
    rowCount: Array.isArray(rows) ? rows.length : 0,
    dataStatusCounts: statuses,
  };
}

export function collectExportArtifacts(manifest, readText) {
  const artifacts = Array.isArray(manifest?.artifacts) ? manifest.artifacts : [];
  const diagnostics = [];
  const collected = [];
  for (const artifact of artifacts) {
    try {
      const text = readText(artifact.path);
      const json = JSON.parse(text);
      collected.push({
        ...artifact,
        checksum: { algorithm: 'sha256', value: sha256Text(text) },
        summary: summarizeJsonArtifact(artifact.path, json),
      });
    } catch (error) {
      diagnostics.push({ code: 'EXPORT_ARTIFACT_UNREADABLE', path: artifact.path, message: error.message });
    }
  }
  return { ok: diagnostics.length === 0, artifacts: collected, diagnostics };
}

export function buildAuditPack(manifest, readText) {
  const collected = collectExportArtifacts(manifest, readText);
  const totalRows = collected.artifacts.reduce((sum, artifact) => sum + artifact.summary.rowCount, 0);
  const dataStatusCounts = {};
  for (const artifact of collected.artifacts) {
    for (const [status, count] of Object.entries(artifact.summary.dataStatusCounts)) {
      dataStatusCounts[status] = (dataStatusCounts[status] ?? 0) + count;
    }
  }
  return {
    schema: 'pipedata-db-audit-pack/v1',
    phase: 'DB_PHASE_13',
    exportMode: manifest.exportMode,
    artifactCount: collected.artifacts.length,
    totalRows,
    dataStatusCounts,
    artifacts: collected.artifacts,
    diagnostics: collected.diagnostics,
    ok: collected.ok,
  };
}

export function validateExportManifest(manifest) {
  const diagnostics = [];
  const artifacts = Array.isArray(manifest?.artifacts) ? manifest.artifacts : [];
  const seen = new Set();
  for (const artifact of artifacts) {
    if (!artifact.path || !artifact.kind) diagnostics.push({ code: 'EXPORT_ARTIFACT_FIELDS_REQUIRED' });
    if (seen.has(artifact.path)) diagnostics.push({ code: 'EXPORT_ARTIFACT_DUPLICATE', path: artifact.path });
    seen.add(artifact.path);
  }
  if (manifest?.checksumPolicy !== 'COMPUTE_SHA256_AT_EXPORT_TIME') {
    diagnostics.push({ code: 'EXPORT_CHECKSUM_POLICY_REQUIRED' });
  }
  return { ok: diagnostics.length === 0, diagnostics };
}
