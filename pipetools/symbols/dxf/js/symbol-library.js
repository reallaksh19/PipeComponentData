(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const state = { manifest: null, symbols: [], filtered: [], selectedId: null, family: 'ALL', query: '', dbIndex: null, dbRows: new Map(), dbStatus: 'optional' };
  const normal = value => String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const arr = value => Array.isArray(value) ? value : value ? [value] : [];

  async function loadScript(url) {
    await new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = url;
      tag.onload = resolve;
      tag.onerror = reject;
      document.head.appendChild(tag);
    });
  }

  async function loadManifest() {
    try {
      const res = await fetch('dxf-symbol-manifest.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      state.manifest = await res.json();
    } catch (err) {
      await loadScript('dxf-symbol-manifest.js');
      state.manifest = window.DXF_SYMBOL_MANIFEST;
    }
    state.symbols = Array.isArray(state.manifest) ? state.manifest : arr(state.manifest?.symbols);
    state.filtered = state.symbols;
    state.selectedId = state.symbols[0]?.id || null;
    return state.manifest;
  }

  function lookupMatches(row, lookup) {
    if (!row || !lookup) return false;
    return Object.entries(lookup).every(([key, expected]) => {
      const actual = row[key] ?? row[key.charAt(0).toLowerCase() + key.slice(1)];
      if (actual == null) return false;
      return normal(actual) === normal(expected);
    });
  }

  function rowField(row, ...names) {
    for (const name of names) if (row?.[name] != null && row[name] !== '') return row[name];
    return '';
  }

  function resolveSymbolForComponent(row) {
    const componentType = normal(rowField(row, 'componentType', 'family', 'type'));
    if (!componentType) return { status: 'SVG_NOT_AVAILABLE', reason: 'Missing componentType', symbol: null, svg: null };
    const candidates = state.symbols.filter(symbol => normal(symbol.componentType) === componentType || normal(symbol.family) === componentType);
    let best = null;
    let bestScore = -1;
    for (const symbol of candidates) {
      let score = 0;
      if (lookupMatches(row, symbol.dbLookup)) score += 100;
      const checks = [
        ['subtype', rowField(row, 'subtype', 'componentSubtype'), symbol.subtype],
        ['valveType', rowField(row, 'valveType', 'subtype'), symbol.dbLookup?.valveType || symbol.subtype],
        ['endType', rowField(row, 'endType', 'connectionType'), symbol.endType],
        ['reducerType', rowField(row, 'reducerType', 'subtype'), symbol.dbLookup?.reducerType || symbol.subtype],
        ['oletType', rowField(row, 'oletType', 'subtype'), symbol.dbLookup?.oletType || symbol.subtype],
        ['facing', rowField(row, 'facing'), symbol.facing],
        ['classRating', rowField(row, 'classRating', 'rating'), symbol.classRating],
        ['nps', rowField(row, 'nps', 'nominalSize'), symbol.nps]
      ];
      for (const [, actual, expected] of checks) {
        if (actual && expected && normal(actual) === normal(expected)) score += 10;
      }
      if (score > bestScore) { best = symbol; bestScore = score; }
    }
    if (!best || bestScore <= 0) return { status: 'SVG_NOT_AVAILABLE', reason: `No DXF manifest match for ${componentType}`, symbol: null, svg: null };
    return { status: 'OK', reason: 'DXF manifest match', symbol: best, svg: best.svg, sourceCode: best.sourceCode };
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  function dbRoot(url) {
    const parsed = new URL(url, location.href);
    parsed.pathname = parsed.pathname.replace(/pipetools\/data\/db-index\.json$/, '').replace(/data\/db-index\.json$/, '');
    return parsed.href;
  }

  async function loadDBIndex() {
    const candidates = arr(state.manifest?.dbIndexCandidates);
    for (const candidate of candidates) {
      try {
        const json = await fetchJson(candidate);
        state.dbIndex = json;
        state.dbRoot = dbRoot(candidate);
        state.dbStatus = 'index loaded';
        await Promise.all([...new Set(state.symbols.map(symbol => symbol.family))].map(loadFamilyRows));
        linkDbCounts();
        state.dbStatus = 'linked';
        return json;
      } catch (_) {}
    }
    state.dbStatus = 'offline/static';
    return null;
  }

  async function loadFamilyRows(family) {
    if (state.dbRows.has(family)) return state.dbRows.get(family);
    const record = arr(state.dbIndex?.families).find(item => item.family === family || item.componentType === family);
    const urls = [...arr(record?.runtimeUrl), ...arr(record?.runtimeUrls), ...arr(record?.repositoryPath), ...arr(record?.repositoryPaths)];
    const rows = [];
    for (const item of urls) {
      const url = item.startsWith('../') || item.startsWith('/') ? item : new URL(item, state.dbRoot || location.href).href;
      try {
        const payload = await fetchJson(url);
        rows.push(...(Array.isArray(payload) ? payload : payload.rows || payload.data || payload.items || Object.values(payload.byKey || {})));
      } catch (_) {}
    }
    state.dbRows.set(family, rows);
    return rows;
  }

  function linkDbCounts() {
    for (const symbol of state.symbols) {
      const rows = state.dbRows.get(symbol.family) || [];
      const matches = rows.filter(row => lookupMatches(row, symbol.dbLookup));
      symbol.dbMatches = matches.length;
      symbol.dbSample = matches.slice(0, 3).map(row => row.id || row.key || row.code).filter(Boolean);
    }
  }

  function applyFilters() {
    const q = normal(state.query);
    state.filtered = state.symbols.filter(symbol => {
      if (state.family !== 'ALL' && symbol.family !== state.family) return false;
      if (!q) return true;
      return normal([symbol.id, symbol.sourceCode, symbol.title, symbol.family, symbol.subtype, symbol.endType, symbol.standard].join(' ')).includes(q);
    });
    if (!state.filtered.some(symbol => symbol.id === state.selectedId)) state.selectedId = state.filtered[0]?.id || null;
  }

  function renderFamilies() {
    const families = ['ALL', ...new Set(state.symbols.map(symbol => symbol.family))];
    $('#familyNav').innerHTML = families.map(family => `<button class="chip ${family === state.family ? 'active' : ''}" data-family="${esc(family)}">${family === 'ALL' ? 'All' : esc(family)} <span>${family === 'ALL' ? state.symbols.length : state.symbols.filter(s => s.family === family).length}</span></button>`).join('');
    $$('#familyNav .chip').forEach(button => button.addEventListener('click', () => { state.family = button.dataset.family; refresh(); }));
  }

  function dbBadge(symbol) {
    if (!state.dbIndex) return '<span class="badge muted">DB optional</span>';
    if (symbol.dbMatches > 0) return `<span class="badge ok">${symbol.dbMatches} DB rows</span>`;
    return '<span class="badge warn">unmatched</span>';
  }

  function renderGrid() {
    $('#symbolGrid').innerHTML = state.filtered.length ? state.filtered.map(symbol => `<article class="card ${symbol.id === state.selectedId ? 'selected' : ''}" data-id="${esc(symbol.id)}" tabindex="0"><header><b>${esc(symbol.sourceCode)}</b><span>${esc(symbol.family)}</span></header><img src="${esc(symbol.svg)}" alt="${esc(symbol.title)}" loading="lazy"><h2>${esc(symbol.title)}</h2><p><code>${esc(symbol.subtype || '—')}</code> · ${esc(symbol.standard || 'standard pending')}</p>${dbBadge(symbol)}</article>`).join('') : '<div class="empty">No matching DXF symbols.</div>';
    $$('#symbolGrid .card').forEach(card => card.addEventListener('click', () => { state.selectedId = card.dataset.id; renderGrid(); renderDetail(); }));
  }

  function renderDetail() {
    const symbol = state.symbols.find(item => item.id === state.selectedId);
    $('#detailPanel').innerHTML = symbol ? `<div class="detail-figure"><img src="${esc(symbol.svg)}" alt="${esc(symbol.title)}"></div><div class="detail-meta"><h2>${esc(symbol.title)}</h2><dl>${['sourceCode','sourceDxf','svg','family','componentType','subtype','endType','facing','standard','quality'].map(key => `<div><dt>${esc(key)}</dt><dd>${esc(symbol[key] ?? '—')}</dd></div>`).join('')}</dl><h3>DB lookup keys</h3><pre>${esc(JSON.stringify(symbol.dbLookup || {}, null, 2))}</pre><p class="note">Unsupported rows return <code>SVG_NOT_AVAILABLE</code>; no generic fallback is used.</p></div>` : '<div class="empty">SVG_NOT_AVAILABLE</div>';
  }

  function renderStatus() {
    $('#totalCount').textContent = state.symbols.length;
    $('#shownCount').textContent = state.filtered.length;
    $('#dbStatus').textContent = state.dbStatus;
  }

  function refresh() { applyFilters(); renderFamilies(); renderGrid(); renderDetail(); renderStatus(); }

  async function boot() {
    $('#searchBox').addEventListener('input', event => { state.query = event.target.value; refresh(); });
    try { await loadManifest(); refresh(); await loadDBIndex(); refresh(); }
    catch (err) { $('#symbolGrid').innerHTML = `<div class="empty error">Could not load DXF symbol manifest: ${esc(err.message)}</div>`; }
  }

  window.DxfSymbolLibrary = { state, loadManifest, loadDBIndex, loadFamilyRows, resolveSymbolForComponent };
  window.resolveSymbolForComponent = resolveSymbolForComponent;
  document.addEventListener('DOMContentLoaded', boot);
})();
