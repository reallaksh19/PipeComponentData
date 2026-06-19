const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const FIT_SCALE = 0.5625;

export function bindPipeSpecDetailActions(row) {
  const inspector = document.getElementById('inspector-body');
  const source = document.getElementById('source-svg-panel');
  if (!row || (!inspector && !source)) return;
  const payload = JSON.stringify(row, null, 2);
  if (source) source.dataset.svgScale = source.dataset.svgScale || String(FIT_SCALE);
  [inspector, source].filter(Boolean).forEach((host) => {
    host.querySelectorAll('[data-detail-action]').forEach((button) => {
      button.addEventListener('click', () => runDetailAction(button.dataset.detailAction, { button, host: inspector ?? host, payload }));
    });
  });
}

async function runDetailAction(action, context) {
  if (action?.startsWith('tab-')) return selectTab(context, action.replace('tab-', ''));
  if (action === 'svg-zoom-in') return zoomSvg(context.host, 0.08);
  if (action === 'svg-zoom-out') return zoomSvg(context.host, -0.08);
  if (action === 'svg-fit') return fitSvg(context.host);
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

function zoomSvg(host, delta) {
  const svg = sourceSvg();
  if (!svg) return setStatus(host, 'Centre SVG not ready');
  const panel = document.getElementById('source-svg-panel');
  const next = Math.min(1.2, Math.max(0.4, Number(panel?.dataset.svgScale ?? FIT_SCALE) + delta));
  if (panel) panel.dataset.svgScale = String(next);
  svg.style.transform = `scale(${next})`;
  svg.style.transformOrigin = 'center';
  setStatus(host, `Centre SVG zoom ${Math.round(next * 100)}%`);
}

function fitSvg(host) {
  const svg = sourceSvg();
  if (!svg) return setStatus(host, 'Centre SVG not ready');
  const panel = document.getElementById('source-svg-panel');
  if (panel) panel.dataset.svgScale = String(FIT_SCALE);
  svg.style.transform = `scale(${FIT_SCALE})`;
  svg.style.transformOrigin = 'center';
  setStatus(host, 'Centre SVG fit 56%');
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
