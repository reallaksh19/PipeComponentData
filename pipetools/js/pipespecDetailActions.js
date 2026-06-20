const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const FIT_SCALE = 0.5625;
const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;
const DEFAULT_PAN_X = '25vw';
const DEFAULT_PAN_Y = '-33vh';

export function bindPipeSpecDetailActions(row) {
  const inspector = document.getElementById('inspector-body');
  const source = document.getElementById('source-svg-panel');
  if (!row || (!inspector && !source)) return;
  const payload = JSON.stringify(row, null, 2);
  initSourceViewport();
  bindSourcePan();
  [inspector, source].filter(Boolean).forEach((host) => {
    host.querySelectorAll('[data-detail-action]').forEach((button) => {
      button.onclick = () => runDetailAction(button.dataset.detailAction, { button, host: button.closest('.panel') ?? host, payload });
    });
  });
}

async function runDetailAction(action, context) {
  if (action?.startsWith('tab-')) return selectTab(context, action.replace('tab-', ''));
  if (action === 'svg-zoom-in') return zoomSvg(context.host, 0.1);
  if (action === 'svg-zoom-out') return zoomSvg(context.host, -0.1);
  if (action === 'svg-fit' || action === 'svg-pan-home') return fitSvg(context.host);
  if (action === 'copy-json') return copyJson(context);
  if (action === 'open-svg-preview') return openSvgPreview(context);
}

function selectTab({ button, host }, tab) {
  host.querySelectorAll('[data-inspector-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.inspectorPanel !== tab;
  });
  host.querySelectorAll('[data-tab-target]').forEach((tabButton) => {
    tabButton.classList.toggle('active', tabButton === button);
  });
  setStatus(host, `${tab.toUpperCase()} view selected`);
}

async function copyJson({ button, host, payload }) {
  try {
    await writeClipboard(payload);
    setStatus(host, 'Copied row JSON');
    pulseButton(button, 'Copied');
  } catch (error) {
    setStatus(host, `Copy failed: ${error.message}`);
  }
}

function initSourceViewport() {
  const panel = sourcePanel();
  if (!panel) return;
  setViewport({ scale: FIT_SCALE, panX: DEFAULT_PAN_X, panY: DEFAULT_PAN_Y });
}

function bindSourcePan() {
  const canvas = document.querySelector('.source-svg-canvas');
  if (!canvas || canvas.dataset.panBound === 'true') return;
  canvas.dataset.panBound = 'true';
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    if (!sourceTarget() || event.button !== 0) return;
    if (event.target.closest?.('.source-data-overlay,.source-svg-meta,.svg-loading,.svg-unavailable')) return;
    const view = readViewport();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: toPx(view.panX, 'x'), panY: toPx(view.panY, 'y') };
    canvas.dataset.panActive = 'true';
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const view = readViewport();
    setViewport({ scale: view.scale, panX: `${drag.panX + event.clientX - drag.x}px`, panY: `${drag.panY + event.clientY - drag.y}px` });
  });
  const end = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    canvas.releasePointerCapture?.(event.pointerId);
    delete canvas.dataset.panActive;
    drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

function zoomSvg(host, delta) {
  if (!sourceTarget()) return setStatus(host, 'Centre SVG not ready');
  const view = readViewport();
  const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale + delta));
  setViewport({ ...view, scale: next });
  setStatus(host, `Centre SVG zoom ${Math.round(next * 100)}% · drag to pan`);
}

function fitSvg(host) {
  if (!sourceTarget()) return setStatus(host, 'Centre SVG not ready');
  setViewport({ scale: FIT_SCALE, panX: DEFAULT_PAN_X, panY: DEFAULT_PAN_Y });
  setStatus(host, 'Centre SVG fit 56% · pan +25vw / -33vh');
}

function setViewport({ scale, panX, panY }) {
  const panel = sourcePanel();
  if (!panel) return;
  panel.dataset.svgScale = String(scale);
  panel.dataset.svgPanX = String(panX);
  panel.dataset.svgPanY = String(panY);
  panel.style.setProperty('--source-svg-scale', String(scale));
  panel.style.setProperty('--source-svg-pan-x', String(panX));
  panel.style.setProperty('--source-svg-pan-y', String(panY));
}

function readViewport() {
  const panel = sourcePanel();
  return {
    scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(panel?.dataset.svgScale ?? FIT_SCALE) || FIT_SCALE)),
    panX: panel?.dataset.svgPanX || DEFAULT_PAN_X,
    panY: panel?.dataset.svgPanY || DEFAULT_PAN_Y
  };
}

function toPx(value, axis) {
  const text = String(value ?? '0').trim();
  const number = parseFloat(text);
  if (!Number.isFinite(number)) return 0;
  if (text.endsWith('vw')) return window.innerWidth * number / 100;
  if (text.endsWith('vh')) return window.innerHeight * number / 100;
  if (text.endsWith('%')) {
    const canvas = document.querySelector('.source-svg-canvas');
    const size = axis === 'x' ? canvas?.clientWidth : canvas?.clientHeight;
    return (size ?? 0) * number / 100;
  }
  return number;
}

function openSvgPreview({ host }) {
  const svg = sourceSvg();
  if (!svg) return setStatus(host, 'Centre SVG not ready');
  if (typeof window === 'undefined' || typeof window.open !== 'function') return setStatus(host, 'SVG preview unavailable');
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=920,height=680');
  if (!popup) return setStatus(host, 'Popup blocked');
  popup.document.write(previewHtml(svg.outerHTML));
  popup.document.close();
  setStatus(host, 'Opened centre SVG preview');
}

function sourcePanel() {
  return document.getElementById('source-svg-panel');
}

function sourceTarget() {
  return document.querySelector('[data-pipespec-source-svg-host] svg, [data-pipespec-source-svg-host] img.dxf-symbol-img');
}

function sourceSvg() {
  return document.querySelector('[data-pipespec-source-svg-host] svg');
}

async function writeClipboard(text) {
  if (globalThis.navigator?.clipboard?.writeText) {
    await globalThis.navigator.clipboard.writeText(text);
    return;
  }
  const doc = globalThis.document;
  if (!doc?.body) throw new Error('clipboard unavailable');
  const textarea = doc.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  doc.body.appendChild(textarea);
  textarea.select();
  const ok = doc.execCommand?.('copy');
  textarea.remove();
  if (!ok) throw new Error('clipboard unavailable');
}

function previewHtml(svgMarkup) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>PipeSpec SVG Preview</title><style>body{margin:0;background:#0b1120;color:#e5f0ff;font:14px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}.wrap{background:#fff;border-radius:18px;padding:18px;width:min(92vw,980px)}svg{width:100%;height:auto;transform:none!important}</style></head><body><div class="wrap">${svgMarkup}</div></body></html>`;
}

function pulseButton(button, label) {
  const span = button.querySelector('span');
  if (!span) return;
  const previous = span.textContent;
  span.textContent = label;
  setTimeout(() => { span.textContent = previous; }, 1100);
}

function setStatus(host, text) {
  const status = host?.querySelector?.('[data-detail-status]') ?? document.querySelector('[data-detail-status]');
  if (status) status.textContent = esc(text);
}
