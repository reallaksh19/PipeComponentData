import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function listJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listJsFiles(path));
    if (entry.isFile() && path.endsWith('.js')) files.push(path);
  }
  return files.sort();
}

export async function readSourceFile(path) {
  return readFile(path, 'utf8');
}
