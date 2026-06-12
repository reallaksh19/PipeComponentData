import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { familiesByExpansionStatus, promotionCandidates, validateSourceExpansionLedger } from '../src/db/sourceExpansionLedger.js';

const ledger = JSON.parse(fs.readFileSync('data/audit/source-expansion-ledger.json', 'utf8'));

test('DB Phase 23: source expansion ledger is conservative and valid', () => {
  const validation = validateSourceExpansionLedger(ledger);
  assert.equal(validation.ok, true, JSON.stringify(validation.diagnostics));
  assert.equal(ledger.policy.sourceBackedPromotionOnly, true);
  assert.equal(ledger.policy.noFabricatedEngineeringValues, true);
  assert.equal(ledger.policy.noNearestEngineeringFallback, true);
  assert.equal(ledger.policy.missingValues, 'null_or_UNAVAILABLE');
});

test('DB Phase 23: source-backed promotion candidates are explicit', () => {
  assert.deepEqual(promotionCandidates(ledger).map((item) => item.family).sort(), ['FITTING', 'FLANGE', 'PIPE', 'VALVE']);
  assert.deepEqual(familiesByExpansionStatus(ledger, 'READY_FOR_PROMOTION'), ['FITTING', 'FLANGE', 'PIPE', 'VALVE']);
  assert.equal(ledger.families.PIPE.promotionPhase, 'DB_PHASE_24');
  assert.equal(ledger.families.FLANGE.promotionPhase, 'DB_PHASE_25');
  assert.equal(ledger.families.VALVE.promotionPhase, 'DB_PHASE_26');
  assert.equal(ledger.families.FITTING.promotionPhase, 'DB_PHASE_27');
});

test('DB Phase 23: blocked and manual-review families are not promoted', () => {
  assert.equal(ledger.families.GASKET.status, 'BLOCKED_SOURCE_MISSING');
  assert.equal(ledger.families.SUPPORT.status, 'MANUAL_REVIEW');
  assert.equal(ledger.families.OLET.status, 'BLOCKED_SOURCE_MISSING');
  assert.equal(ledger.families.REDUCER.status, 'BLOCKED_SOURCE_MISSING');
  for (const family of Object.values(ledger.families)) assert.equal(family.productionComplete, false);
});

test('DB Phase 23: ledger gate is wired into db chain', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts['db:gate23'], 'npm run db:gate22 && node --test gates/db-phase-23-source-expansion-ledger.gate.test.js');
  assert.match(pkg.scripts['db:gate24'], /db:gate23/);
});
