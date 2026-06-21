#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(scriptDir, 'dxf-symbol-manifest.json');
const outputDir = path.join(scriptDir, 'text-inventory');

const args = process.argv.slice(2);
const all = args.includes('--all');
const requested = args.filter((arg) => arg !== '--all');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const symbols = manifest.symbols || [];
const selected = all ? symbols : requested.map((sourceCode) => symbols.find((symbol) => symbol.sourceCode === sourceCode)).filter(Boolean);

if (!selected.length) {
  console.error('Usage: node pipetools/symbols/dxf/audit-svg-text-inventory.mjs Pipe1 [Flan1 ...] | --all');
  process.exit(1);
}

await mkdir(outputDir, { recursive: true });

for (const symbol of selected) {
  const svgPath = path.resolve(scriptDir, symbol.svg);
  const svgText = await readFile(svgPath, 'utf8');
  const entries = inventoryFromSvg(svgText);
  const report = {
    schema: 'PipeToolsSvgTextInventory.v1',
    sourceCode: symbol.sourceCode,
    svg: symbol.svg,
    measurement: 'approximate-static-attributes',
    textNodeCount: entries.length,
    entries,
  };
  const out = path.join(outputDir, `${symbol.sourceCode}.text-inventory.json`);
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${symbol.sourceCode}: ${entries.length} text entries -> ${path.relative(process.cwd(), out)}`);
}

function inventoryFromSvg(svgText) {
  const entries = [];
  const textRe = /<(text|tspan)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  let index = 0;
  while ((match = textRe.exec(svgText))) {
    const [, tagName, attrs, body] = match;
    const text = stripTags(body).replace(/\s+/g, ' ').trim();
    if (!text || /^(?:null|undefined)$/i.test(text)) continue;
    const x = firstNumber(attr(attrs, 'x'));
    const y = firstNumber(attr(attrs, 'y'));
    const fontSize = firstNumber(attr(attrs, 'font-size')) || 80;
    const width = Math.max(fontSize * 0.6, text.length * fontSize * 0.58);
    const bbox = Number.isFinite(x) && Number.isFinite(y)
      ? { x, y: y - fontSize, width, height: fontSize }
      : null;
    entries.push({
      path: `${tagName}[${++index}]`,
      tagName,
      text,
      normalizedText: normalizeText(text),
      x: Number.isFinite(x) ? x : null,
      y: Number.isFinite(y) ? y : null,
      bbox,
      center: bbox ? { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 } : null,
      classification: classify(text),
      className: attr(attrs, 'class') || '',
      style: attr(attrs, 'style') || '',
      approximate: true,
    });
  }
  return entries;
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]+>/g, '');
}

function attr(attrs, name) {
  const re = new RegExp(`\\b${name}=["']([^"']*)["']`, 'i');
  return attrs.match(re)?.[1] || '';
}

function firstNumber(value) {
  const raw = String(value || '').split(/[\s,]+/).find(Boolean);
  const number = Number(raw);
  return Number.isFinite(number) ? number : NaN;
}

function normalizeText(value) {
  return String(value || '').replace(/[\u2010-\u2014\u2212]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
}

function classify(text) {
  const normalized = normalizeText(text);
  if (/^-+$/.test(normalized)) return 'placeholder';
  if (/^(?:mm|kg|kg\/m|kg\/mtr|kg\/mtr|cm4|mtr)$/i.test(normalized)) return 'unit';
  if (/diameter|thick|weight|bore|pcd|bolt|rf|radius/i.test(text)) return 'label';
  return 'text';
}
