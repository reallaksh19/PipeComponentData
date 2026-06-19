const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export function summarizeDbIndex(index) {
  const families = Array.isArray(index?.families) ? index.families : [];
  const totals = families.reduce((acc, entry) => {
    const indexed = Number(entry.rowCount ?? 0);
    const source = Number(entry.sourceRowCount ?? indexed);
    const pending = Math.max(source - indexed, 0);
    acc.indexedRows += indexed;
    acc.sourceRows += source;
    acc.pendingRows += pending;
    acc.sourceFiles += Number(entry.sourceFileCount ?? 0);
    acc.svgReady += entry.svgSupported ? 1 : 0;
    return acc;
  }, { families: families.length, indexedRows: 0, sourceRows: 0, pendingRows: 0, sourceFiles: 0, svgReady: 0 });
  const percent = totals.sourceRows ? Math.round((totals.indexedRows / totals.sourceRows) * 1000) / 10 : 0;
  return { ...totals, percent, rows: families.map((entry) => familyCoverage(entry)) };
}

export function renderDbCoverageStrip(index) {
  const summary = summarizeDbIndex(index);
  if (!summary.families) return '';
  const headline = `${summary.families} families · ${summary.indexedRows} indexed · ${summary.sourceRows} source · ${summary.percent}% coverage · SVG ${summary.svgReady}/${summary.families}`;
  const rows = summary.rows.map((row) => `<button class="db-index-row" data-group="component" data-card="${esc(row.family)}">
    <span><strong>${esc(row.label)}</strong><small>${esc(row.standard)}</small></span>
    <span>${esc(row.indexedRows)}/${esc(row.sourceRows)}</span>
    <span>${esc(row.pendingRows)} pending</span>
    <span>${row.svgSupported ? 'SVG' : 'No SVG'}</span>
  </button>`).join('');
  return `<section class="strip db-coverage-strip db-health-strip"><div class="strip-title">DB Health</div><div class="db-coverage-panel">
    <div class="db-coverage-summary"><strong>${esc(headline)}</strong><span>${esc(summary.pendingRows)} pending</span></div>
    <details class="db-health-details"><summary>Details</summary><div class="db-index-browser" aria-label="Database index browser">${rows}</div></details>
  </div></section>`;
}

function familyCoverage(entry) {
  const indexedRows = Number(entry?.rowCount ?? 0);
  const sourceRows = Number(entry?.sourceRowCount ?? indexedRows);
  return {
    family: entry?.family ?? 'UNKNOWN',
    label: entry?.label ?? entry?.family ?? 'Unknown',
    standard: entry?.standard ?? '—',
    indexedRows,
    sourceRows,
    pendingRows: Math.max(sourceRows - indexedRows, 0),
    svgSupported: Boolean(entry?.svgSupported),
  };
}
