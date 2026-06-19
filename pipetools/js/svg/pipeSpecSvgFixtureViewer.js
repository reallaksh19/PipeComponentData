import { buildPipeSpecSvgString, getPipeSpecSvgAudit } from './pipeSpecSvgEngine.js';
import { getPipeSpecSvgFixtureCatalog } from './pipeSpecSvgFixtureCatalog.js';

const fixtures = getPipeSpecSvgFixtureCatalog();
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const families = ['ALL', ...new Set(fixtures.map((item) => item.family))];
let activeFamily = 'ALL';

function countsByFamily() {
  return fixtures.reduce((acc, item) => ({ ...acc, [item.family]: (acc[item.family] ?? 0) + 1 }), {});
}

function classFor(status) {
  return status === 'COMPONENT_TEMPLATE' ? 'ok' : status === 'APPROX_TEMPLATE' ? 'warn' : 'bad';
}

function setHtml(id, html) {
  document.getElementById(id).innerHTML = html;
}

function renderFilters() {
  const counts = countsByFamily();
  setHtml('fixture-filters', families.map((family) => {
    const count = family === 'ALL' ? fixtures.length : counts[family];
    const active = family === activeFamily ? ' active' : '';
    return `<button class="seg-btn${active}" data-family="${safe(family)}">${safe(family)} <small>${count}</small></button>`;
  }).join(''));
  document.querySelectorAll('[data-family]').forEach((button) => button.addEventListener('click', () => {
    activeFamily = button.dataset.family;
    render();
  }));
}

async function card(fixture) {
  const audit = getPipeSpecSvgAudit(fixture.row);
  const mismatch = audit.status !== fixture.expected.status || audit.renderable !== fixture.expected.renderable;
  const badge = mismatch ? 'MISMATCH' : audit.status;
  const preview = audit.renderable
    ? await buildPipeSpecSvgString(fixture.row, { width: 390, height: 262 })
    : `<div class="svg-unavailable">${safe(audit.reason)}</div>`;
  const checks = fixture.checks.map((check) => `<li>${safe(check)}</li>`).join('');
  return `<article class="fixture-card priority-${fixture.priority}">
    <header><div><p class="eyebrow">${safe(fixture.family)} / ${safe(fixture.subtype)}</p><h2>${safe(fixture.id)}</h2></div><span class="fixture-badge ${classFor(audit.status)}">${safe(badge)}</span></header>
    <div class="fixture-preview">${preview}</div>
    <section class="fixture-meta"><p><strong>Reason:</strong> ${safe(audit.reason)}</p><p><strong>Action:</strong> ${safe(audit.nextAction)}</p><ul>${checks}</ul></section>
  </article>`;
}

async function renderCards() {
  const filtered = activeFamily === 'ALL' ? fixtures : fixtures.filter((item) => item.family === activeFamily);
  setHtml('fixture-grid', '<div class="svg-loading">Rendering SVG fixtures...</div>');
  setHtml('fixture-grid', (await Promise.all(filtered.map(card))).join(''));
  document.getElementById('fixture-count').textContent = `${filtered.length} fixtures`;
}

async function render() {
  renderFilters();
  await renderCards();
}

render().catch((error) => setHtml('fixture-grid', `<div class="svg-unavailable">Fixture render failed: ${safe(error.message)}</div>`));
