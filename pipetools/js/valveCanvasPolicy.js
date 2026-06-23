import { dimensionFacts, formatFact, weightFacts } from './dimensionDisplay.js';

const FACE_TO_FACE_LABEL_RE = /^(?:F2F RF|F2F RTJ|BW length|C-E)$/i;
const PANEL_VERSION = 'valve-face-to-face-only-v1';

export function applyValveCanvasPolicy(row, scope = document) {
  const body = scope?.getElementById?.('source-svg-body') || document.getElementById('source-svg-body');
  if (!body) return;

  body.querySelectorAll('[data-valve-source-data-panel]').forEach((node) => node.remove());
  body.classList.remove('valve-source-data-layout');
  body.style.removeProperty('grid-template-rows');
  body.style.removeProperty('gap');

  const canvas = body.querySelector('.source-svg-canvas');
  if (!canvas || !isValveRow(row)) return;

  canvas.querySelectorAll('.source-data-overlay').forEach((node) => node.remove());
  body.classList.add('valve-source-data-layout');
  body.dataset.valveCanvasPolicy = PANEL_VERSION;
  body.style.gridTemplateRows = 'minmax(0, 1fr) auto';
  body.style.gap = '8px';

  const panel = buildValveFactsPanel(row);
  canvas.insertAdjacentElement('afterend', panel);
}

function buildValveFactsPanel(row) {
  const panel = document.createElement('div');
  panel.className = 'source-data-below source-data-below-valve';
  panel.dataset.valveSourceDataPanel = 'true';
  applyPanelStyle(panel);

  const title = document.createElement('strong');
  title.textContent = 'Valve DB values';
  applyTitleStyle(title);
  panel.append(title);

  const facts = valveBelowImageFacts(row);
  if (!facts.length) {
    const empty = document.createElement('span');
    empty.textContent = 'No secondary valve dimensions on this selected row.';
    applyFactStyle(empty);
    panel.append(empty);
    return panel;
  }

  facts.forEach((fact) => {
    const item = document.createElement('span');
    applyFactStyle(item);
    const label = document.createElement('b');
    label.textContent = fact.label;
    applyLabelStyle(label);
    const value = document.createElement('em');
    value.textContent = formatFact(fact);
    applyValueStyle(value);
    item.append(label, value);
    panel.append(item);
  });
  return panel;
}

function valveBelowImageFacts(row) {
  return [...dimensionFacts(row), ...weightFacts(row)]
    .filter((fact) => fact?.label && !FACE_TO_FACE_LABEL_RE.test(fact.label));
}

function isValveRow(row) {
  return String(row?.componentType ?? row?.component ?? row?.family ?? '').trim().toUpperCase() === 'VALVE';
}

function applyPanelStyle(panel) {
  Object.assign(panel.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '6px 10px',
    alignItems: 'center',
    padding: '8px 10px',
    border: '1px solid rgba(38,56,80,.85)',
    borderRadius: '12px',
    background: 'rgba(7,17,31,.92)',
    color: '#dbeafe',
    boxShadow: '0 10px 30px rgba(0,0,0,.18)',
  });
}

function applyTitleStyle(title) {
  Object.assign(title.style, {
    gridColumn: '1 / -1',
    color: '#f8fafc',
    fontSize: '11px',
    letterSpacing: '.08em',
    textTransform: 'uppercase',
  });
}

function applyFactStyle(item) {
  Object.assign(item.style, {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    minWidth: '0',
    paddingTop: '3px',
    borderTop: '1px solid rgba(219,234,254,.14)',
    fontSize: '11px',
  });
}

function applyLabelStyle(label) {
  Object.assign(label.style, {
    color: '#93c5fd',
    fontWeight: '650',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  });
}

function applyValueStyle(value) {
  Object.assign(value.style, {
    color: '#dbeafe',
    fontStyle: 'normal',
    whiteSpace: 'nowrap',
  });
}
