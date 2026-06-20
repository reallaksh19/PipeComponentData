const MANIFEST_JSON_URL = new URL('../../symbols/dxf/dxf-symbol-manifest.json', import.meta.url).href;
const MANIFEST_JS_URL = new URL('../../symbols/dxf/dxf-symbol-manifest.js', import.meta.url).href;
const FETCH_TIMEOUT_MS = 6000;

let manifestPromise;
let manifestUrl = MANIFEST_JSON_URL;
let symbols = [];

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const arr = (value) => Array.isArray(value) ? value : value ? [value] : [];
const aliases = new Map(Object.entries({
  WELD_NECK: 'WN', WELDNECK: 'WN', WN_FLANGE: 'WN', SLIP_ON: 'SO', SLIPON: 'SO', BLIND_FLANGE: 'BLIND',
  NON_METALLIC_FLAT_RING: 'FLAT_RING', FLAT: 'FLAT_RING', SWG: 'SPIRAL_WOUND', RING_TYPE_JOINT: 'RTJ',
  LONG_RADIUS_90_ELBOW: 'ELBOW_90', LR_90_ELBOW: 'ELBOW_90', ELBOW90: 'ELBOW_90', BEND_90: 'ELBOW_90',
  ELBOW45: 'ELBOW_45', BEND_45: 'ELBOW_45', EQUAL_TEE: 'TEE_STRAIGHT', STRAIGHT_TEE: 'TEE_STRAIGHT',
  REDUCING_TEE: 'TEE_REDUCING', RED_TEE: 'TEE_REDUCING', CONC: 'CONCENTRIC', ECC: 'ECCENTRIC',
  THREADOLET: 'THREDOLET', THREADOLET_: 'THREDOLET', SOCKETOLET: 'SOCKOLET',
  SWING_CHECK_VALVE: 'SWING_CHECK', WAFER_CHECK_VALVE: 'WAFER_CHECK', BUTTERFLY_VALVE: 'BUTTERFLY',
  FLANGE: 'FLANGED', FLG: 'FLANGED'
}));

function norm(value) {
  const raw = String(value ?? '').trim().toUpperCase().replace(/^CL\s*/i, '').replace(/[#]/g, '').replace(/[\s\-\/]+/g, '_');
  return aliases.get(raw) || raw;
}

function rowField(row, key) {
  if (!row || typeof row !== 'object') return undefined;
  if (Object.hasOwn(row, key)) return row[key];
  const match = Object.keys(row).find((name) => norm(name) === norm(key));
  const value = match ? row[match] : undefined;
  return value && typeof value === 'object' && 'value' in value ? value.value : value;
}

function semanticValue(row, key) {
  const lookups = {
    componentType: ['componentType', 'componentFamily', 'family', 'component'],
    subtype: ['subtype', 'type', 'fittingType', 'flangeType', 'gasketType', 'reducerType', 'oletType'],
    valveType: ['valveType', 'subtype', 'type'],
    reducerType: ['reducerType', 'subtype', 'type'],
    oletType: ['oletType', 'subtype', 'type'],
    endType: ['endType', 'endConnection', 'connectionType'],
    facing: ['facing', 'faceType'],
    classRating: ['classRating', 'rating', 'pressureClass'],
    nps: ['nps', 'largeNps', 'nominalSize'],
    standard: ['standard', 'sourceStandard']
  }[key] || [key];
  for (const name of lookups) {
    const value = rowField(row, name);
    if (value !== '' && value != null) return value;
  }
  return undefined;
}

function normalizeSymbol(symbol) {
  return {
    ...symbol,
    sourceCode: symbol.sourceCode || symbol.code,
    sourceDxf: symbol.sourceDxf || `${String(symbol.sourceCode || symbol.code || '').toLowerCase()}.dxf`,
    title: symbol.title || symbol.label || symbol.id,
    dbLookup: symbol.dbLookup || symbol.lookup || {},
    quality: symbol.quality || 'DXF_DERIVED'
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { cache: 'no-cache', ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.pipetoolsDxfManifest = 'true';
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(script);
  });
}

export async function loadDxfSymbolManifest() {
  if (!manifestPromise) {
    manifestPromise = (async () => {
      try {
        const manifest = await fetchJson(MANIFEST_JSON_URL);
        manifestUrl = MANIFEST_JSON_URL;
        symbols = arr(manifest.symbols).map(normalizeSymbol);
        return manifest;
      } catch (jsonError) {
        await loadScript(MANIFEST_JS_URL);
        if (!globalThis.DXF_SYMBOL_MANIFEST) throw jsonError;
        manifestUrl = MANIFEST_JS_URL;
        symbols = arr(globalThis.DXF_SYMBOL_MANIFEST.symbols).map(normalizeSymbol);
        return globalThis.DXF_SYMBOL_MANIFEST;
      }
    })();
  }
  return manifestPromise;
}

function lookupMatches(row, lookup) {
  const entries = Object.entries(lookup || {}).filter(([, value]) => value !== '' && value != null);
  if (!entries.length) return false;
  return entries.every(([key, expected]) => norm(semanticValue(row, key)) === norm(expected));
}

function standardScore(symbol, row) {
  const rowStandard = norm(semanticValue(row, 'standard'));
  if (!rowStandard || !symbol.standard) return 0;
  const symbolStandard = norm(symbol.standard);
  return symbolStandard.includes(rowStandard) || rowStandard.includes(symbolStandard) ? 5 : 0;
}

function scoreSymbol(symbol, row) {
  const lookupWeight = Object.keys(symbol.dbLookup || {}).length * 10;
  const fieldWeight = ['facing', 'endType', 'classRating', 'nps'].reduce((score, key) => {
    const expected = symbol[key];
    const actual = semanticValue(row, key);
    return expected && actual && norm(expected) === norm(actual) ? score + 1 : score;
  }, 0);
  return lookupWeight + fieldWeight + standardScore(symbol, row);
}

function mountImageFallback(container, result, reason) {
  const img = new Image();
  img.src = result.svgUrl;
  img.alt = `${result.symbol.title} DXF symbol`;
  img.loading = 'eager';
  img.dataset.dxfSymbolImg = 'true';
  img.className = 'dxf-symbol-img';
  container.innerHTML = '';
  container.append(img);
  container.insertAdjacentHTML('beforeend', `<div class="source-svg-meta">DXF ${esc(result.sourceCode)} · ${esc(result.symbol.family)} · ${esc(result.symbol.subtype || '—')} · file reference</div>`);
  img.onerror = () => {
    container.innerHTML = `<div class="svg-unavailable"><strong>SVG_NOT_AVAILABLE</strong><br>${esc(reason)}</div>`;
  };
  return { ...result, renderMode: 'img', reason: `${result.reason}; inline fetch unavailable, mounted SVG file reference` };
}

export async function resolveDxfSymbolForComponent(row) {
  await loadDxfSymbolManifest();
  if (!row || typeof row !== 'object') return { status: 'SVG_NOT_AVAILABLE', reason: 'No component row supplied', symbol: null };
  const matches = symbols.filter((symbol) => lookupMatches(row, symbol.dbLookup));
  if (!matches.length) return { status: 'SVG_NOT_AVAILABLE', reason: 'No DXF manifest mapping matched this DB row', symbol: null, row };
  const symbol = matches.sort((a, b) => scoreSymbol(b, row) - scoreSymbol(a, row))[0];
  const svgUrl = new URL(symbol.svg, manifestUrl).href;
  return { status: 'OK', reason: 'Matched DXF manifest dbLookup fields', symbol, svgUrl, sourceCode: symbol.sourceCode };
}

export async function mountDxfSymbolSvg(row, container) {
  if (!container) return { status: 'SVG_NOT_AVAILABLE', reason: 'No SVG host supplied', symbol: null };
  let result;
  try {
    result = await resolveDxfSymbolForComponent(row);
    if (result.status !== 'OK') {
      container.innerHTML = `<div class="svg-unavailable"><strong>SVG_NOT_AVAILABLE</strong><br>${esc(result.reason)}</div>`;
      return result;
    }
    const response = await fetchWithTimeout(result.svgUrl);
    if (!response.ok) throw new Error(`DXF SVG file failed to load: ${response.status} ${response.statusText}`);
    const svgText = await response.text();
    if (!/<svg[\s>]/i.test(svgText) || /<script[\s>]/i.test(svgText)) {
      const failed = { ...result, status: 'SVG_NOT_AVAILABLE', reason: 'DXF SVG file is not a safe inline SVG payload' };
      container.innerHTML = `<div class="svg-unavailable"><strong>SVG_NOT_AVAILABLE</strong><br>${esc(failed.reason)}</div>`;
      return failed;
    }
    container.innerHTML = `${svgText}<div class="source-svg-meta">DXF ${esc(result.sourceCode)} · ${esc(result.symbol.family)} · ${esc(result.symbol.subtype || '—')}</div>`;
    return { ...result, renderMode: 'inline' };
  } catch (error) {
    if (result?.status === 'OK') return mountImageFallback(container, result, error.message);
    const failed = { status: 'SVG_NOT_AVAILABLE', reason: error.message || 'DXF symbol lookup failed', symbol: null };
    container.innerHTML = `<div class="svg-unavailable"><strong>SVG_NOT_AVAILABLE</strong><br>${esc(failed.reason)}</div>`;
    return failed;
  }
}

export async function getDxfSymbolKey(row) {
  const result = await resolveDxfSymbolForComponent(row);
  return result.status === 'OK' ? result.sourceCode : 'SVG_NOT_AVAILABLE';
}
