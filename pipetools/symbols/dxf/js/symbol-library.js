(() => {
  'use strict';

  const state = {
    manifest: null,
    symbols: [],
    filtered: [],
    dbIndex: null,
    familyRows: new Map(),
    offsets: {},
    activeFamily: 'ALL',
    search: '',
    selectedId: null,
    dbStatus: 'pending',
    offsetStatus: 'pending',
    manifestUrl: 'dxf-symbol-manifest.json'
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const text = v => (v == null ? '' : String(v));
  const norm = v => text(v).trim().toUpperCase().replace(/^CL\s*/i, '').replace(/[#]/g, '').replace(/[\s\-\/]+/g, '_');
  const arr = v => (!v ? [] : Array.isArray(v) ? v : [v]);
  const uniq = list => [...new Set(list.filter(Boolean))];

  const aliases = new Map(Object.entries({
    WELD_NECK: 'WN', WELDNECK: 'WN', WN_FLANGE: 'WN', SLIP_ON: 'SO', SLIPON: 'SO', BLIND_FLANGE: 'BLIND',
    NON_METALLIC_FLAT_RING: 'FLAT_RING', FLAT: 'FLAT_RING', SWG: 'SPIRAL_WOUND', RING_TYPE_JOINT: 'RTJ',
    LONG_RADIUS_90_ELBOW: 'ELBOW_90', LR_90_ELBOW: 'ELBOW_90', ELBOW90: 'ELBOW_90', BEND_90: 'ELBOW_90',
    ELBOW45: 'ELBOW_45', BEND_45: 'ELBOW_45', EQUAL_TEE: 'TEE_STRAIGHT', STRAIGHT_TEE: 'TEE_STRAIGHT',
    REDUCING_TEE: 'TEE_REDUCING', RED_TEE: 'TEE_REDUCING', CONC: 'CONCENTRIC', ECC: 'ECCENTRIC',
    THREADOLET: 'THREDOLET', THREADOLET_: 'THREDOLET', SOCKETOLET: 'SOCKOLET', FLANGE: 'FLANGED', FLG: 'FLANGED'
  }));

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
      id: s.id || s.sourceCode || s.code,
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

  async function loadOffsetDefaults() {
    try {
      const payload = await fetchJson('../../data/dxf-symbol-offsets.json');
      state.offsets = payload?.offsets && typeof payload.offsets === 'object' ? payload.offsets : {};
      const count = Object.keys(state.offsets).length;
      state.offsetStatus = `${count} committed`;
    } catch (err) {
      state.offsets = {};
      state.offsetStatus = `auto-fit only`;
    }
    linkAudit();
    return state.offsets;
  }

  function familyLabel(family) {
    return ({ PIPE: 'Pipe', GASKET: 'Gasket', FLANGE: 'Flange', VALVE: 'Valve', FITTING: 'Fitting', REDUCER: 'Reducer', OLET: 'Olet', LINE_BLANK: 'Line Blank' }[family] || family);
  }

  function rowField(row, key) {
    if (!row || typeof row !== 'object') return undefined;
    if (Object.hasOwn(row, key)) return unwrap(row[key]);
    const k = Object.keys(row).find(name => canonical(name) === canonical(key));
    return k ? unwrap(row[k]) : undefined;
  }

  function semanticValue(row, key) {
    const lookups = {
      componentType: ['componentType', 'componentFamily', 'family', 'component'],
      subtype: ['subtype', 'type', 'fittingType', 'flangeType', 'gasketType', 'reducerType', 'oletType', 'supportKind'],
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

  function lookupMatches(row, lookup) {
    const entries = Object.entries(lookup || {}).filter(([, v]) => v != null && v !== '');
    if (!entries.length) return false;
    return entries.every(([key, expected]) => canonical(semanticValue(row, key)) === canonical(expected));
  }

  function resolveSymbolForComponent(componentRow) {
    if (!componentRow || typeof componentRow !== 'object') {
      return { status: 'SVG_NOT_AVAILABLE', reason: 'No component row supplied', symbol: null };
    }
    const matches = state.symbols.filter(s => lookupMatches(componentRow, s.dbLookup));
    if (!matches.length) {
      return { status: 'SVG_NOT_AVAILABLE', reason: 'No DXF manifest mapping matched this row', symbol: null, row: componentRow };
    }
    const symbol = matches.sort((a, b) => scoreSymbol(b, componentRow) - scoreSymbol(a, componentRow))[0];
    return { status: 'OK', symbol, svg: symbol.svg, sourceCode: symbol.sourceCode, reason: 'Matched DXF manifest dbLookup fields' };
  }

  function scoreSymbol(symbol, row) {
    const lookupWeight = Object.keys(symbol.dbLookup || {}).length * 10;
    const fieldWeight = ['facing', 'endType', 'classRating', 'nps'].reduce((score, key) => {
      const expected = symbol[key];
      const actual = semanticValue(row, key);
      return expected && actual && canonical(expected) === canonical(actual) ? score + 1 : score;
    }, 0);
    return lookupWeight + fieldWeight;
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
    linkAudit();
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
    state.familyRows.set(family, dedupeRows(rows));
    return state.familyRows.get(family);
  }

  function dedupeRows(rows) {
    const byId = new Map();
    rows.forEach((row, index) => {
      const id = row?.id ?? `${row?.componentType || row?.component || 'ROW'}:${index}`;
      if (!byId.has(id)) byId.set(id, row);
    });
    return [...byId.values()];
  }

  function linkAudit() {
    state.symbols.forEach(symbol => {
      const rows = state.familyRows.get(symbol.family) || [];
      const matches = rows.filter(row => lookupMatches(row, symbol.dbLookup));
      symbol.dbMatches = matches.length;
      symbol.dbSample = matches.slice(0, 3).map(r => r.id || r.key || r.code || r.name).filter(Boolean);
      symbol.offset = state.offsets?.[symbol.sourceCode] || null;
      symbol.audit = auditSymbol(symbol, matches);
    });
  }

  function auditSymbol(symbol, rows) {
    const groups = requiredGroups(symbol);
    const factBuckets = new Map();
    rows.forEach(row => [...dimensionFacts(row), ...weightFacts(row)].forEach(fact => addFact(factBuckets, fact)));
    const available = groups.filter(group => group.labels.some(label => factBuckets.has(label)));
    const missingMajor = groups.filter(group => group.major && !group.labels.some(label => factBuckets.has(label)));
    const missingSecondary = groups.filter(group => !group.major && !group.labels.some(label => factBuckets.has(label)));
    return {
      requiredGroups: groups,
      available,
      missingMajor,
      missingSecondary,
      factBuckets,
      coveragePercent: groups.length ? Math.round((available.length / groups.length) * 100) : 0,
      calloutReady: rows.length > 0 && missingMajor.length === 0
    };
  }

  function addFact(map, fact) {
    if (!fact || !fact.label || isDash(fact.value)) return;
    const bucket = map.get(fact.label) || { label: fact.label, count: 0, examples: [] };
    bucket.count += 1;
    if (bucket.examples.length < 3) bucket.examples.push({ value: formatFact(fact), path: fact.path || 'direct' });
    map.set(fact.label, bucket);
  }

  function requiredGroups(symbol) {
    const fam = symbol.family;
    if (fam === 'VALVE') return [
      { name: 'F2F / length', labels: ['F2F RF', 'F2F RTJ', 'BW length'], major: true },
      { name: 'Height', labels: ['Height'], major: true },
      { name: 'Handwheel dia', labels: ['HW dia'], major: false },
      { name: 'Weight', labels: ['RF/RTJ weight', 'BW weight', 'Weight'], major: false }
    ];
    if (fam === 'FLANGE') return [
      { name: 'OD', labels: ['OD'], major: true },
      { name: 'Thickness', labels: ['Wall / Thk'], major: true },
      { name: 'PCD', labels: ['PCD'], major: false },
      { name: 'Bolt count', labels: ['Bolt count'], major: false },
      { name: 'Bolt size', labels: ['Bolt size'], major: false },
      { name: 'Weight', labels: ['Weight'], major: false }
    ];
    if (fam === 'GASKET') return [
      { name: 'OD', labels: ['OD'], major: true },
      { name: 'ID', labels: ['ID'], major: true },
      { name: 'Thickness', labels: ['Wall / Thk'], major: true }
    ];
    if (fam === 'PIPE') return [
      { name: 'OD', labels: ['OD'], major: true },
      { name: 'Wall / Thk', labels: ['Wall / Thk'], major: true },
      { name: 'Weight / m', labels: ['Weight / m'], major: false }
    ];
    if (fam === 'FITTING') return [
      { name: 'C-E / developed length', labels: ['C-E', 'Dev. len'], major: true },
      { name: 'Weight', labels: ['Weight'], major: false }
    ];
    if (fam === 'REDUCER') return [
      { name: 'Length', labels: ['C-E', 'BW length', 'Dev. len'], major: true },
      { name: 'Weight', labels: ['Weight'], major: false }
    ];
    if (fam === 'OLET') return [
      { name: 'C-E', labels: ['C-E'], major: false },
      { name: 'Weight', labels: ['Weight'], major: false }
    ];
    if (fam === 'LINE_BLANK') return [
      { name: 'OD', labels: ['OD'], major: true },
      { name: 'Thickness', labels: ['Wall / Thk'], major: true }
    ];
    return [];
  }

  function dimensionFacts(row = {}) {
    const specs = [
      ['F2F RF', 'faceToFaceRfMm', 'faceToFaceMm', 'dimensions.faceToFaceRfMm', 'dimensions.faceToFaceMm'],
      ['F2F RTJ', 'faceToFaceRtjMm', 'dimensions.faceToFaceRtjMm'],
      ['BW length', 'buttWeldLengthMm', 'dimensions.buttWeldLengthMm'],
      ['Height', 'heightMm', 'dimensions.heightMm'],
      ['HW dia', 'handwheelDiaMm', 'dimensions.handwheelDiaMm'],
      ['RTJ add', 'rtjAddLengthMm', 'dimensions.rtjAddLengthMm'],
      ['Gap', 'gapMm', 'dimensions.gapMm'],
      ['OD', 'odMm', 'flangeOdMm', 'outerDiaMm', 'dimensions.odMm', 'dimensions.flangeOdMm', 'dimensions.outerDiaMm'],
      ['ID', 'idMm', 'innerDiaMm', 'dimensions.idMm', 'dimensions.innerDiaMm'],
      ['Wall / Thk', 'wallMm', 'thicknessMm', 'flangeThicknessMm', 'dimensions.wallMm', 'dimensions.thicknessMm', 'dimensions.flangeThicknessMm'],
      ['RF dia', 'rfDiaMm', 'dimensions.rfDiaMm'],
      ['RF height', 'rfHeightMm', 'dimensions.rfHeightMm'],
      ['PCD', 'pcdMm', 'dimensions.pcdMm'],
      ['Bolt count', 'boltCount', 'bolting.boltCount'],
      ['Bolt size', 'boltSizeMm', 'isoBoltSizeMm', 'bolting.boltSizeMm'],
      ['C-E', 'centerToEndMm', 'ctrToEndMm', 'dimensions.centerToEndMm'],
      ['Dev. len', 'developedLengthMm', 'devLenMm', 'dimensions.developedLengthMm'],
      ['Over cap', 'overCapMm', 'overallCapMm', 'dimensions.overCapMm', 'dimensions.overallCapMm'],
    ];
    return specs.map(([label, ...paths]) => makeFact(label, firstPathValue(row, paths), unitFor(label))).filter(Boolean);
  }

  function weightFacts(row = {}) {
    const specs = [
      ['Weight', 'weightKg', 'weights.weightKg'],
      ['RF/RTJ weight', 'rfRtjKg', 'weights.rfRtjKg'],
      ['BW weight', 'buttWeldKg', 'weights.buttWeldKg'],
      ['Weight / m', 'weightKgPerM', 'weights.weightKgPerM', 'weights.emptyPipeKgPerM', 'weights.pipeKgPerM'],
    ];
    return specs.map(([label, ...paths]) => makeFact(label, firstPathValue(row, paths), label === 'Weight / m' ? 'kg/m' : 'kg')).filter(Boolean);
  }

  function makeFact(label, match, unit) {
    if (!match || match.value == null || match.value === '' || isDash(match.value)) return null;
    return { label, value: match.value, unit, path: match.path };
  }

  function firstPathValue(row, paths = []) {
    for (const path of paths) {
      const value = unwrap(readPath(row, path));
      if (value !== '' && value != null && !isDash(value)) return { value, path };
    }
    return null;
  }

  function readPath(row, path) {
    let value = row;
    for (const part of String(path).split('.')) value = value?.[part];
    return value;
  }

  function unitFor(label) {
    return label === 'Bolt count' ? '' : 'mm';
  }

  function formatFact(fact) {
    return fact?.unit ? `${fact.value} ${fact.unit}` : String(fact?.value ?? '');
  }

  function applyFilters() {
    const q = canonical(state.search);
    state.filtered = state.symbols.filter(s => {
      if (state.activeFamily !== 'ALL' && s.family !== state.activeFamily) return false;
      if (!q) return true;
      const missing = s.audit?.missingMajor?.map(item => item.name).join(' ') || '';
      const offset = s.offset ? 'calibrated offset' : 'auto fit uncalibrated';
      return canonical([s.id, s.sourceCode, s.sourceDxf, s.title, s.family, s.subtype, s.endType, s.facing, s.standard, missing, offset].join(' ')).includes(q);
    });
    if (!state.filtered.some(s => s.id === state.selectedId)) state.selectedId = state.filtered[0]?.id || null;
  }

  function dbBadge(symbol) {
    if (!state.dbIndex) return '<span class="badge muted">DB optional</span>';
    if (symbol.dbMatches > 0) return `<span class="badge ok">${symbol.dbMatches} DB rows</span>`;
    return '<span class="badge warn">unmatched</span>';
  }

  function calloutBadge(symbol) {
    if (!symbol.dbMatches) return '<span class="badge muted">callout pending</span>';
    if (symbol.audit?.calloutReady) return `<span class="badge ok">callouts ${symbol.audit.coveragePercent}%</span>`;
    return `<span class="badge warn">missing ${symbol.audit?.missingMajor?.length || 0}</span>`;
  }

  function offsetBadge(symbol) {
    return symbol.offset ? '<span class="badge ok">offset fixed</span>' : '<span class="badge muted">auto-fit</span>';
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
        <header><b>${esc(s.sourceCode)}</b><span class="family">${esc(familyLabel(s.family))}</span></header>
        <img src="${esc(s.svg)}" alt="${esc(s.title)}" loading="lazy">
        <h2>${esc(s.title)}</h2>
        <p><code>${esc(s.subtype || '—')}</code> · ${esc(s.standard || 'standard pending')}</p>
        <div class="badge-row">${dbBadge(s)}${calloutBadge(s)}${offsetBadge(s)}</div>
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
          <div><dt>Offset</dt><dd>${s.offset ? esc(`${s.offset.panX}, ${s.offset.panY}, ${s.offset.scale}`) : 'auto-fit'}</dd></div>
        </dl>
        ${renderAuditDetail(s)}
        <h3>DB lookup keys</h3><pre>${esc(JSON.stringify(s.dbLookup || {}, null, 2))}</pre>
        <p class="note">This page audits manifest linkage, normalized DB callout readiness, and calibration status. It does not modify source SVGs or create generic fallbacks.</p>
      </div>`;
  }

  function renderAuditDetail(symbol) {
    const audit = symbol.audit || auditSymbol(symbol, []);
    const shown = audit.available.map(group => {
      const labels = group.labels.filter(label => audit.factBuckets.has(label));
      const sample = labels.map(label => audit.factBuckets.get(label)).find(Boolean);
      const example = sample?.examples?.[0];
      return `<li><strong>${esc(group.name)}</strong><span>${esc(example?.value || labels.join(' / '))} <em>${esc(example?.path || '')}</em></span></li>`;
    }).join('') || '<li><strong>None</strong><span>No DB-backed facts found</span></li>';
    const missing = audit.missingMajor.map(group => `<li><strong>${esc(group.name)}</strong><span>${esc(group.labels.join(' / '))}</span></li>`).join('') || '<li><strong>Major dimensions</strong><span>complete</span></li>';
    const secondary = audit.missingSecondary.map(group => `<li><strong>${esc(group.name)}</strong><span>${esc(group.labels.join(' / '))}</span></li>`).join('') || '<li><strong>Secondary dimensions</strong><span>complete or not required</span></li>';
    return `<h3>DXF audit badges</h3><div class="badge-row">${dbBadge(symbol)}${calloutBadge(symbol)}${offsetBadge(symbol)}</div>
      <h3>Shown callout evidence</h3><ul class="audit-list">${shown}</ul>
      <h3>Missing major dimensions</h3><ul class="audit-list">${missing}</ul>
      <h3>Missing secondary dimensions</h3><ul class="audit-list">${secondary}</ul>`;
  }

  function renderStatus() {
    $('#totalCount').textContent = state.symbols.length;
    $('#shownCount').textContent = state.filtered.length;
    $('#dbStatus').textContent = state.dbStatus;
    $('#offsetStatus').textContent = state.offsetStatus;
    const summary = auditSummary();
    setText('#linkedMetric', summary.linked);
    setText('#readyMetric', summary.ready);
    setText('#missingMetric', summary.missingMajor);
    setText('#offsetMetric', summary.offsets);
    setText('#unmatchedMetric', summary.unmatched);
  }

  function auditSummary() {
    return state.symbols.reduce((acc, s) => {
      if (s.dbMatches > 0) acc.linked += 1;
      else acc.unmatched += 1;
      if (s.audit?.calloutReady) acc.ready += 1;
      acc.missingMajor += s.audit?.missingMajor?.length || 0;
      if (s.offset) acc.offsets += 1;
      return acc;
    }, { linked: 0, ready: 0, missingMajor: 0, offsets: 0, unmatched: 0 });
  }

  function setText(selector, value) {
    const el = $(selector);
    if (el) el.textContent = value;
  }

  function refresh() { linkAudit(); applyFilters(); renderFamilies(); renderGrid(); renderDetail(); renderStatus(); }

  async function boot() {
    $('#searchBox').addEventListener('input', e => { state.search = e.target.value; refresh(); });
    try {
      await loadManifest();
      refresh();
      await loadOffsetDefaults();
      refresh();
      await loadDBIndex();
      refresh();
    } catch (err) {
      $('#symbolGrid').innerHTML = `<div class="empty error">Could not load DXF symbol manifest: ${esc(err.message)}</div>`;
    }
  }

  function unwrap(value) {
    return value && typeof value === 'object' && 'value' in value ? value.value : value;
  }

  function canonical(value) {
    const raw = norm(value);
    return aliases.get(raw) || raw;
  }

  function isDash(value) {
    return /^[-–—]+$/.test(text(value).trim());
  }

  window.DxfSymbolLibrary = { state, loadManifest, loadDBIndex, loadFamilyRows, loadOffsetDefaults, resolveSymbolForComponent, auditSymbol };
  window.resolveSymbolForComponent = resolveSymbolForComponent;
  document.addEventListener('DOMContentLoaded', boot);
})();
