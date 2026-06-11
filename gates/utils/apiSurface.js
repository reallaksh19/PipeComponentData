import { readFile } from 'node:fs/promises';

const EXPORT_RE = /^export\s+(?:\{([^}]+)\}|(?:const|function|class)\s+([A-Za-z0-9_]+))/gm;

export async function readApiSurface(path) {
  const text = await readFile(path, 'utf8');
  const names = new Set();
  let match;
  while ((match = EXPORT_RE.exec(text))) {
    if (match[1]) {
      for (const part of match[1].split(',')) names.add(part.trim().split(' as ')[0]);
    }
    if (match[2]) names.add(match[2]);
  }
  return [...names].filter(Boolean).sort();
}
