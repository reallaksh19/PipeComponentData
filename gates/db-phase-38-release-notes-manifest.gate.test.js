import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const notes = JSON.parse(fs.readFileSync('data/audit/release-notes-manifest.json', 'utf8'));

test('DB Phase 38: release notes are scoped to foundation release', () => {
  assert.equal(notes.schema, 'pipedata-release-notes-manifest/v1');
  assert.equal(notes.phase, 'DB_PHASE_38');
  assert.equal(notes.release, 'v0.1.0-foundation');
  assert.equal(notes.status, 'FOUNDATION_NOTES_READY');
});

test('DB Phase 38: release notes list core foundation capabilities', () => {
  assert.ok(notes.includedCapabilities.includes('exact-public-lookup-api'));
  assert.ok(notes.includedCapabilities.includes('typescript-declarations'));
  assert.ok(notes.includedCapabilities.includes('public-export-pack'));
  assert.ok(notes.includedCapabilities.includes('coverage-dashboard'));
});

test('DB Phase 38: limitations and data safety remain explicit', () => {
  assert.ok(notes.limitations.includes('not-production-complete'));
  assert.ok(notes.limitations.includes('full-family-coverage-incomplete'));
  assert.equal(notes.safety.noFabricatedEngineeringValues, true);
  assert.equal(notes.safety.noNearestEngineeringFallback, true);
  assert.equal(notes.safety.missingValuesRemainNullOrUnavailable, true);
  assert.equal(notes.safety.rawSourceTreePublishedToPages, false);
});
