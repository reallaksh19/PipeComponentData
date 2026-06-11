import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import capabilities from '../contracts/capabilities.json' with { type: 'json' };

test('Phase 13: capability matrix has supported output cells', () => {
  const supported = Object.values(capabilities).flatMap((row) => Object.values(row)).filter((v) => v === 'SUPPORTED');
  assert.ok(supported.length >= 30);
});

test('Phase 13: all source and gate modules stay under 200 lines', () => {
  const files = listFiles(['src', 'gates']).filter((file) => file.endsWith('.js'));
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= 200, `${file} has ${lines} lines`);
  }
});

test('Phase 13: cumulative gate scripts are present through final phase', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  for (let phase = 0; phase <= 13; phase += 1) {
    assert.ok(pkg.scripts[`gate:phase${phase}`], `missing gate:phase${phase}`);
  }
  assert.equal(pkg.scripts.test, 'npm run gate:phase13');
});

function listFiles(roots) {
  return roots.flatMap((root) => walk(root));
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
