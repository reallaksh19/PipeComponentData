import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const checklist = JSON.parse(fs.readFileSync('data/audit/consumer-onboarding-checklist.json', 'utf8'));
const fixtures = JSON.parse(fs.readFileSync('data/exports/exact-lookup-fixtures.json', 'utf8'));

test('DB Phase 40: consumer onboarding checklist is present', () => {
  assert.equal(checklist.schema, 'pipedata-consumer-onboarding-checklist/v1');
  assert.equal(checklist.phase, 'DB_PHASE_40');
  assert.equal(checklist.status, 'ONBOARDING_CHECKLIST_READY');
});

test('DB Phase 40: onboarding uses stable exact lookup workflow', () => {
  assert.ok(checklist.requiredSteps.includes('call-lookupComponentExact'));
  assert.ok(checklist.requiredSteps.includes('handle-FOUND'));
  assert.ok(checklist.requiredSteps.includes('handle-NO_EXACT_MATCH'));
  assert.ok(checklist.requiredSteps.includes('handle-MISSING_DIMENSION'));
  assert.ok(checklist.requiredSteps.includes('preserve-provenance-in-downstream-result'));
});

test('DB Phase 40: onboarding fixture list matches exact lookup fixture queries', () => {
  const knownQueries = new Set(fixtures.cases.map((row) => row.query));
  for (const query of checklist.minimumFixtures) {
    assert.ok(knownQueries.has(query), `missing exact lookup fixture for ${query}`);
  }
});

test('DB Phase 40: onboarding acceptance rules preserve no-fallback behavior', () => {
  assert.equal(checklist.acceptanceRules.wrongRatingMustNotFallback, true);
  assert.equal(checklist.acceptanceRules.missingDimensionMustRemainVisible, true);
  assert.equal(checklist.acceptanceRules.rawSourcePathsHiddenByDefault, true);
  assert.equal(checklist.acceptanceRules.provenanceRequired, true);
});
