(() => {
  'use strict';

  const state = {
    manifest: null,
    symbols: [],
    filtered: [],
    dbIndex: null,
    familyRows: new Map(),
    activeFamily: 'ALL',
    search: '',
    selectedId: null,
    dbStatus: 'pending',
    manifestUrl: 'dxf-symbol-manifest.json'
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const text = v => (v == null ? '' : String(v));
  const norm = v => text(v).trim().toUpperCase().replace(/[\s\-\/]+/g, '_');
  const arr = v => (!v ? [] : Array.isArray(v) ? v : [v]);
  const uniq = list => [...new Set(list.filter(Boolean))];

  function esc(value) {
    return text(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function fetchJson(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  }

  async function fetchFirstJson(candidates) {
    const errors = [];
    for (const url of uniq(candidates)) {
      try { return { url, json: await fetchJson(url) }; }
      catch (err) { errors.push(`${url}: ${err.message}`); }
    }
    throw new Error(errors.join('; '));
  }

  function manifestCandidates() {
    return [document.currentScript?.dataset?.manifest, './dxf-symbol-manifest.json', 'dxf-symbol-manifest.json'];
  }

  function normalizeSymbol(s) {
    return {
      ...s,
      sourceCode: s.sourceCode || s.code,
      title: s.title || s.label,
      dbLookup: s.dbLookup || s.lookup || {},
      quality: s.quality || 'DXF_DERIVED'
    };
  }

  async function loadManifest() {
    try {
      const result = await fetchFirstJson(manifestCandidates());
      state.manifestUrl = result.url;
      state.manifest = result.json;
    } catch (err) {
      if (!window.DXF_SYMBOL_MANIFEST) throw err;
      state.manifest = window.DXF_SYMBOL_MANIFEST;
      state.manifestUrl = 'dxf-symbol-manifest.js fallback';
    }
    state.symbols = (state.manifest.symbols || []).map(normalizeSymbol);
    state.selectedId ||= state.symbols[0]?.id || null;
    return state.manifest;
  }

  function familyLabel(family) {
    return ({ PIPE: 'Pipe', GASKET: 'Gasket', FLANGE: 'Flange', VALVE: 'Valve', FITTING: 'Fitting', REDUCER: 'Reducer', OLET: 'Olet', LINE_BLANK: 'Line Blank' }[family] || family);
  }

  function rowField(row, key) {
    if (!row || typeof row !== 'object') return undefined;
    if (Object.hasOwn(row, key)) return row[key];
    const k = Object.keys(row).find(name => norm(name) === norm(key));
    return k ? row[k] : undefined;
  }

  function semanticValue(row, key) {
    if (key === 'componentType') return rowField(row, 'componentType') || rowField(row, 'componentFamily') || rowField(row, 'family');
    if (key === 'subtype') return rowField(row, 'subtype') || rowField(row, 'type') || rowField(row, 'fittingType');
    return rowField(row, key);
  }

  function lookupMatches(row, lookup) {
    const entries = Object.entries(lookup || {}).filter(([, v]) => v != null && v !== '');
    if (!entries.length) return false;
    return entries.every(([key, expected]) => norm(semanticValue(row, key)) === norm(expected));
  }

  function resolveSymbolForComponent(componentRow) {
    if (!componentRow || typeof componentRow !== 'object') {
      return { status: 'SVG_NOT_AVAILABLE', reason: 'No component row supplied', symbol: null };
    }
    const matches = state.symbols.filter(s => lookupMatches(componentRow, s.dbLookup));
    if (!matches.length) {
      return { status: 'SVG_NOT_AVAILABLE', reason: 'No DXF manifest mapping matched this row', symbol: null, row: componentRow };
    }
    const score = s => Object.keys(s.dbLookup || {}).length + (s.facing && norm(s.facing) === norm(rowField(componentRow, 'facing')) ? 1 : 0);
    const symbol = matches.sort((a, b) => score(b) - score(a))[0];
    return { status: 'OK', symbol, svg: symbol.svg, sourceCode: symbol.sourceCode, reason: 'Matched DXF manifest dbLookup fields' };
  }

  function deriveRepoRoot(dbIndexUrl) {
    const absolute = new URL(dbIndexUrl, window.location.href);
    absolute.pathname = absolute.pathname.replace(/pipetools\/data\/db-index\.json$/, '').replace(/data\/db-index\.json$/, '');
    return absolute.toString();
  }

  function resolveUrl(base, path) {
    try { return new URL(path, new URL(base, window.location.href)).toString(); }
    catch { return path; }
  }

  async function loadDBIndex() {
    const candidates = state.manifest?.dbIndexCandidates || [];
    try {
      state.dbStatus = 'loading-index'; renderStatus();
      const result = await fetchFirstJson(candidates);
      state.dbIndex = result.json;
      state.dbIndexUrl = result.url;
      state.dbRootUrl = deriveRepoRoot(result.url);
      state.dbStatus = 'index-loaded';
      await Promise.all([...new Set(state.symbols.map(s => s.family))].map(loadFamilyRows));
      state.dbStatus = 'linked';
    } catch (err) {
      state.dbStatus = `offline (${err.message.split(';')[0]})`;
    }
    linkDbCounts();
    return state.dbIndex;
  }

  function familyRecord(family) {
    return (state.dbIndex?.families || []).find(f => f.family === family || f.componentType === family);
  }

  function rowList(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.rows)) return payload.rows;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return payload?.byKey && typeof payload.byKey === 'object' ? Object.values(payload.byKey) : [];
  }

  async function loadFamilyRows(family) {
    if (state.familyRows.has(family)) return state.familyRows.get(family);
    const record = familyRecord(family);
    if (!record) { state.familyRows.set(family, []); return []; }
    const urls = uniq([
      ...arr(record.runtimeUrl).map(u => resolveUrl(state.dbIndexUrl, u)),
      ...arr(record.runtimeUrls).map(u => resolveUrl(state.dbIndexUrl, u)),
      ...arr(record.repositoryPath).map(u => resolveUrl(state.dbRootUrl, u)),
      ...arr(record.repositoryPaths).map(u => resolveUrl(state.dbRootUrl, u))
    ]);
    const rows = [];
    for (const url of urls) {
      try { rows.push(...rowList(await fetchJson(url))); }
      catch (err) { console.warn(`DB pack skipped: ${url}`, err); }
    }
    state.familyRows.set(family, rows);
    return rows;
  }

  function linkDbCounts() {
    state.symbols.forEach(symbol => {
      const rows = state.familyRows.get(symbol.family) || [];
      const matches = rows.filter(row => lookupMatches(row, symbol.dbLookup));
      symbol.dbMatches = matches.length;
      symbol.dbSample = matches.slice(0, 3).map(r => r.id || r.key || r.code || r.name).filter(Boolean);
    });
  }

  function applyFilters() {
    const q = norm(state.search);
    state.filtered = state.symbols.filter(s => {
      if (state.activeFamily !== 'ALL' && s.family !== state.activeFamily) return false;
      if (!q) return true;
      return norm([s.id, s.sourceCode, s.sourceDxf, s.title, s.family, s.subtype, s.endType, s.facing, s.standard].join(' ')).includes(q);
    });
    if (!state.filtered.some(s => s.id === state.selectedId)) state.selectedId = state.filtered[0]?.id || null;
  }

  function dbBadge(symbol) {
    if (!state.dbIndex) return '<span class="badge muted">DB optional</span>';
    if (symbol.dbMatches > 0) return `<span class="badge ok">${symbol.dbMatches} DB rows</span>`;
    return '<span class="badge warn">unmatched</span>';
  }

  function renderFamilies() {
    const nav = $('#familyNav');
    const families = ['ALL', ...new Set(state.symbols.map(s => s.family))];
    nav.innerHTML = families.map(f => `<button type="button" class="chip ${f === state.activeFamily ? 'active' : ''}" data-family="${esc(f)}">${f === 'ALL' ? 'All' : familyLabel(f)} <span>${f === 'ALL' ? state.symbols.length : state.symbols.filter(s => s.family === f).length}</span></button>`).join('');
    $$('.chip', nav).forEach(btn => btn.addEventListener('click', () => { state.activeFamily = btn.dataset.family; refresh(); }));
  }

  function renderGrid() {
    const grid = $('#symbolGrid');
    grid.innerHTML = state.filtered.length ? state.filtered.map(s => `
      <article class="card ${s.id === state.selectedId ? 'selected' : ''}" data-id="${esc(s.id)}" tabindex="0">
        <header><b>${esc(s.sourceCode)}</b><span>${esc(familyLabel(s.family))}</span></header>
        <img src="${esc(s.svg)}" alt="${esc(s.title)}" loading="lazy">
        <h2>${esc(s.title)}</h2>
        <p><code>${esc(s.subtype || '—')}</code> · ${esc(s.standard || 'standard pending')}</p>
        ${dbBadge(s)}
      </article>`).join('') : '<div class="empty">No matching DXF symbols.</div>';
    $$('.card', grid).forEach(card => {
      const select = () => { state.selectedId = card.dataset.id; renderGrid(); renderDetail(); };
      card.addEventListener('click', select);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') select(); });
    });
  }

  function renderDetail() {
    const s = state.symbols.find(item => item.id === state.selectedId);
    const panel = $('#detailPanel');
    if (!s) { panel.innerHTML = '<div class="empty">SVG_NOT_AVAILABLE</div>'; return; }
    panel.innerHTML = `
      <div class="detail-figure"><img src="${esc(s.svg)}" alt="${esc(s.title)}"></div>
      <div class="detail-meta">
        <h2>${esc(s.title)}</h2>
        <dl>
          <div><dt>DXF Code</dt><dd><code>${esc(s.sourceCode)}</code></dd></div>
          <div><dt>Source DXF</dt><dd><code>${esc(s.sourceDxf)}</code></dd></div>
          <div><dt>SVG</dt><dd><code>${esc(s.svg)}</code></dd></div>
          <div><dt>Family</dt><dd>${esc(s.family)}</dd></div>
          <div><dt>Component</dt><dd>${esc(s.componentType)}</dd></div>
          <div><dt>Subtype</dt><dd>${esc(s.subtype || '—')}</dd></div>
          <div><dt>End Type</dt><dd>${esc(s.endType || '—')}</dd></div>
          <div><dt>Facing</dt><dd>${esc(s.facing || '—')}</dd></div>
          <div><dt>Standard</dt><dd>${esc(s.standard || '—')}</dd></div>
          <div><dt>Quality</dt><dd>${esc(s.quality)}</dd></div>
          <div><dt>DB Link</dt><dd>${dbBadge(s)}</dd></div>
        </dl>
        <h3>DB lookup keys</h3><pre>${esc(JSON.stringify(s.dbLookup || {}, null, 2))}</pre>
        <p class="note">Unsupported rows must resolve to <code>SVG_NOT_AVAILABLE</code>; no generic symbol fallback is used.</p>
      </div>`;
  }

  function renderStatus() {
    $('#totalCount').textContent = state.symbols.length;
    $('#shownCount').textContent = state.filtered.length;
    $('#dbStatus').textContent = state.dbStatus;
  }

  function refresh() { applyFilters(); renderFamilies(); renderGrid(); renderDetail(); renderStatus(); }

  async function boot() {
    $('#searchBox').addEventListener('input', e => { state.search = e.target.value; refresh(); });
    try { await loadManifest(); refresh(); await loadDBIndex(); refresh(); }
    catch (err) { $('#symbolGrid').innerHTML = `<div class="empty error">Could not load DXF symbol manifest: ${esc(err.message)}</div>`; }
  }

  window.DxfSymbolLibrary = { state, loadManifest, loadDBIndex, loadFamilyRows, resolveSymbolForComponent };
  window.resolveSymbolForComponent = resolveSymbolForComponent;
  document.addEventListener('DOMContentLoaded', boot);
})();
