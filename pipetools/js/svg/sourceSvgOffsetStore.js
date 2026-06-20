const OFFSET_STORAGE_KEY = 'pipetools.dxf.sourceSvgOffsets.v1';
export const OFFSET_DOC_URL = '../docs/Pipedata/Database/Gensets/dxf-symbol-offsets.json';
export const DEFAULT_SOURCE_SVG_OFFSET = Object.freeze({ panX: '25vw', panY: '-33vh', scale: 0.5625, source: 'built-in-default' });

let committedOffsetsPromise = null;

export async function loadSourceSvgOffset(sourceCode) {
  const code = normalizeCode(sourceCode);
  if (!code) return normalizeOffset(DEFAULT_SOURCE_SVG_OFFSET);
  const local = readLocalOffsets();
  if (local.offsets?.[code]) return normalizeOffset(local.offsets[code]);
  const committed = await readCommittedOffsets();
  return normalizeOffset(committed.offsets?.[code] || DEFAULT_SOURCE_SVG_OFFSET);
}

export function saveSourceSvgOffset(sourceCode, viewport) {
  const code = normalizeCode(sourceCode);
  if (!code) throw new Error('source code unavailable');
  const store = readLocalOffsets();
  store.offsets = store.offsets || {};
  store.offsets[code] = normalizeOffset({
    panX: viewport.panX,
    panY: viewport.panY,
    scale: viewport.scale,
    updatedAt: new Date().toISOString(),
    source: 'browser-fix-button'
  });
  writeLocalOffsets(store);
  return store.offsets[code];
}

export function exportSourceSvgOffsetsPayload() {
  const local = readLocalOffsets();
  return {
    schema: 'PipeToolsDxfSymbolOffsets.v1',
    notes: [
      'Committed defaults are loaded from docs/Pipedata/Database/Gensets/dxf-symbol-offsets.json.',
      'Browser Fix Offset saves local overrides in localStorage. Copy this JSON into the docs file to share defaults.'
    ],
    offsets: local.offsets || {}
  };
}

export function offsetStatusText(sourceCode, offset) {
  const code = normalizeCode(sourceCode) || 'unknown';
  if (!offset) return `${code}: default viewport`;
  return `${code}: pan ${offset.panX},${offset.panY} · zoom ${Math.round(Number(offset.scale || 1) * 100)}%`;
}

async function readCommittedOffsets() {
  if (!committedOffsetsPromise) {
    committedOffsetsPromise = fetch(OFFSET_DOC_URL, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : { offsets: {} })
      .catch(() => ({ offsets: {} }));
  }
  return committedOffsetsPromise;
}

function readLocalOffsets() {
  try {
    const raw = globalThis.localStorage?.getItem(OFFSET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { offsets: {} };
  } catch {
    return { offsets: {} };
  }
}

function writeLocalOffsets(store) {
  globalThis.localStorage?.setItem(OFFSET_STORAGE_KEY, JSON.stringify({
    schema: 'PipeToolsDxfSymbolOffsets.v1',
    offsets: store.offsets || {}
  }));
}

function normalizeCode(sourceCode) {
  return String(sourceCode || '').trim();
}

function normalizeOffset(offset) {
  if (!offset) return null;
  const scale = Number(offset.scale);
  return {
    panX: String(offset.panX ?? DEFAULT_SOURCE_SVG_OFFSET.panX),
    panY: String(offset.panY ?? DEFAULT_SOURCE_SVG_OFFSET.panY),
    scale: Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_SOURCE_SVG_OFFSET.scale,
    updatedAt: offset.updatedAt || null,
    source: offset.source || 'unknown'
  };
}
