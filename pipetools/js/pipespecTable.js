const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function renderPipeSpecTable(rows = [], state = {}) {
  if (!rows.length) return '<div class="empty-state">No matching PipeSpec rows.</div>';
  const headers = ['Type', 'End', 'Facing', 'NPS / DN', 'Class', 'F2F', 'Height', 'Weight', 'Status'];
  return `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => renderPipeSpecRow(row, state.selectedRowId)).join('')}</tbody></table>`;
}

export function bindPipeSpecTable(host, onSelect) {
  host.querySelectorAll('[data-row-id]').forEach((row) => {
    row.addEventListener('click', () => onSelect(row.dataset.rowId));
  });
}

export function renderPipeSpecRow(row, selectedRowId) {
  const d = row.dimensions ?? {};
  const w = row.weights ?? {};
  const selected = row.id === selectedRowId ? ' class="selected"' : '';
  return `<tr${selected} data-row-id="${esc(row.id)}"><td>${esc(row.valveType ?? row.subtype ?? row.componentType)}</td><td>${esc(row.endType ?? row.endConnection)}</td><td>${esc(row.facing ?? '—')}</td><td>NPS ${esc(row.nps)} / DN ${esc(row.dn)}</td><td>CL ${esc(row.classRating)}</td><td>${value(d.faceToFaceRfMm, 'mm')}</td><td>${value(d.heightMm, 'mm')}</td><td>${value(w.rfRtjKg, 'kg')}</td><td class="status">${esc(row.dataStatus ?? row.status ?? 'READY')}</td></tr>`;
}

function value(item, suffix) {
  const raw = item?.value ?? item;
  return raw == null || raw === '' ? '—' : `${esc(raw)} ${suffix}`;
}
