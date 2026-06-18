import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const contract = (name) => new URL(`contracts/db/${name}`, ROOT);
const requiredSchemas = [
  'provenance.schema.json',
  'source-file.schema.json',
  'pipe.schema.json',
  'flange.schema.json',
  'valve.schema.json',
  'fitting.schema.json',
  'reducer.schema.json',
  'olet.schema.json',
  'gasket.schema.json',
  'support.schema.json',
  'data-status-codes.json',
  'contract-manifest.json',
];
const requiredProvenance = ['standard', 'source', 'datasetVersion', 'dataStatus'];
const requiredStatuses = [
  'READY',
  'PARTIAL',
  'SKETCH_ONLY',
  'SOURCE_CONFLICT',
  'MISSING_WEIGHT',
  'MISSING_DIMENSION',
  'PROJECT_OVERRIDE',
  'DEPRECATED',
  'APP_CONFIG',
  'UNSUPPORTED_SOURCE',
];

function readJson(name) {
  return JSON.parse(readFileSync(contract(name), 'utf8'));
}

function sha256(name) {
  return createHash('sha256').update(readFileSync(contract(name))).digest('hex');
}

describe('DB Phase 0 contract freeze', () => {
  it('ships every required DB contract file', () => {
    for (const name of requiredSchemas) {
      assert.doesNotThrow(() => readJson(name), `${name} must exist and parse as JSON`);
    }
  });

  it('requires full provenance on normalized rows', () => {
    const provenance = readJson('provenance.schema.json');
    assert.deepEqual(provenance.required, requiredProvenance);
    for (const name of requiredSchemas.filter((name) => name.endsWith('.schema.json') && name !== 'provenance.schema.json' && name !== 'source-file.schema.json')) {
      assert(readJson(name).required.includes('provenance'), `${name} must require provenance`);
    }
  });

  it('freezes dataStatus vocabulary including audit/source statuses', () => {
    const codes = readJson('data-status-codes.json').codes.map(({ code }) => code);
    assert.deepEqual([...new Set(codes)].sort(), codes.sort());
    for (const code of requiredStatuses) assert(codes.includes(code), `${code} missing`);
  });

  it('keeps DB contract modules small and checksum locked', () => {
    const manifest = readJson('contract-manifest.json');
    const paths = manifest.files.map(({ path }) => path).sort();
    const expected = requiredSchemas.filter((name) => name !== 'contract-manifest.json').map((name) => `contracts/db/${name}`).sort();
    assert.deepEqual(paths, expected);
    for (const file of manifest.files) {
      const name = file.path.replace('contracts/db/', '');
      assert.equal(sha256(name), file.sha256, `${name} checksum drift`);
      assert(readFileSync(contract(name), 'utf8').split('\n').length <= 200, `${name} exceeds 200 lines`);
    }
  });
});
