import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

test('DB Phase 77: olet schema preflight and promotion readiness', () => {
  assert.equal(fs.existsSync('src/db/oletCatalog.js'), true);
  
  const lineCount = fs.readFileSync('src/db/oletCatalog.js', 'utf8').split('\n').length;
  assert.ok(lineCount <= 200, `oletCatalog.js must be under 200 lines, got ${lineCount}`);

  assert.equal(fs.existsSync('data/normalized/olets-weldolet.json'), true);
  assert.equal(fs.existsSync('data/normalized/olets-sockolet.json'), true);
  assert.equal(fs.existsSync('data/normalized/olets-thredolet.json'), true);
  assert.equal(fs.existsSync('data/normalized/olets-elbolet.json'), true);

  const preflight = readJson('data/audit/source-promotion-preflight.json');
  assert.equal(preflight.families.OLET.decision, 'SCHEMA_PROMOTED_READY_FOR_ROWS');
  assert.equal(preflight.families.OLET.promoteRows, true);
});
