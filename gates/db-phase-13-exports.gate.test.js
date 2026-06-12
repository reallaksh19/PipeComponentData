import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildAuditPack, collectExportArtifacts, validateExportManifest } from '../src/db/exportPack.js';

const manifest = JSON.parse(fs.readFileSync('data/exports/db-export-manifest.json', 'utf8'));
const readText = (path) => fs.readFileSync(path, 'utf8');

const requiredPaths = [
  'data/normalized/pipes.json',
  'data/normalized/flanges.json',
  'data/normalized/valves.json',
  'data/normalized/fittings.json',
  'data/normalized/gaskets.json',
  'data/normalized/supports.json',
  'data/indexes/component-search.index.json',
  'data/indexes/override.index.json',
  'data/overrides/project-overrides.sample.json',
];

test('DB Phase 13: export manifest covers data, indexes, and overrides', () => {
  const result = validateExportManifest(manifest);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(manifest.exportMode, 'MANIFEST_WITH_RUNTIME_CHECKSUMS');
  assert.deepEqual(manifest.artifacts.map((row) => row.path), requiredPaths);
});

test('DB Phase 13: artifact collection computes checksums', () => {
  const collected = collectExportArtifacts(manifest, readText);
  assert.equal(collected.ok, true, JSON.stringify(collected.diagnostics));
  assert.equal(collected.artifacts.length, requiredPaths.length);
  for (const artifact of collected.artifacts) {
    assert.match(artifact.checksum.value, /^[a-f0-9]{64}$/);
    assert.equal(artifact.checksum.algorithm, 'sha256');
    assert.ok(artifact.summary.schema, artifact.path);
  }
});

test('DB Phase 13: audit pack summarizes rows and status counts', () => {
  const audit = buildAuditPack(manifest, readText);
  assert.equal(audit.ok, true, JSON.stringify(audit.diagnostics));
  assert.equal(audit.artifactCount, requiredPaths.length);
  assert.ok(audit.totalRows >= 9);
  assert.ok(audit.dataStatusCounts.READY >= 1);
  assert.ok(audit.dataStatusCounts.MISSING_DIMENSION >= 1);
  assert.ok(audit.dataStatusCounts.PROJECT_OVERRIDE >= 1);
});

test('DB Phase 13: unreadable export paths return diagnostics', () => {
  const other = structuredClone(manifest);
  other.artifacts = [{ path: 'data/normalized/no-file.json', kind: 'NORMALIZED_DATA' }];
  const audit = buildAuditPack(other, readText);
  assert.equal(audit.ok, false);
  assert.equal(audit.diagnostics[0].code, 'EXPORT_ARTIFACT_UNREADABLE');
});

test('DB Phase 13: export helper and gate stay under 200 lines', () => {
  for (const file of ['src/db/exportPack.js', 'gates/db-phase-13-exports.gate.test.js']) {
    const lines = fs.readFileSync(file, 'utf8').trimEnd().split('\n').length;
    assert.ok(lines <= 200, `${file} has ${lines} lines`);
  }
});
