const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function bindPipeSpecDetailActions(row) {
  const host = document.getElementById('inspector-body');
  if (!host || !row) return;
  const payload = JSON.stringify(row, null, 2);
  host.dataset.svgScale = '1';

  host.querySelectorAll('[data-detail-action]').forEach((button) => {
    button.addEventListener('click', () => runDetailAction(button.dataset.detailAction, { button, host, payload }));
  });
}

async function runDetailAction(action, context) {
  if (action?.startsWith('tab-')) return selectTab(context, action.replace('tab-', ''));
  if (action === 'svg-zoom-in') return zoomSvg(context.host, 0.12);
  if (action === 'svg-zoom-out') return zoomSvg(context.host, -0.12);
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
  const svg = host.querySelector('[data-pipespec-svg-host] svg');
  if (!svg) return setStatus(host, 'SVG preview not ready');
  const next = Math.min(1.6, Math.max(0.75, Number(host.dataset.svgScale ?? 1) + delta));
  host.dataset.svgScale = String(next);
  svg.style.transform = `scale(${next})`;
  svg.style.transformOrigin = 'center';
  setStatus(host, `SVG zoom ${Math.round(next * 100)}%`);
}

function fitSvg(host) {
  const svg = host.querySelector('[data-pipespec-svg-host] svg');
  if (!svg) return setStatus(host, 'SVG preview not ready');
  host.dataset.svgScale = '1';
  svg.style.transform = 'scale(1)';
  setStatus(host, 'SVG fit to canvas');
}

function openSvgPreview({ host }) {
  const svg = host.querySelector('[data-pipespec-svg-host] svg');
  if (!svg) {
    setStatus(host, 'SVG preview not ready');
    return;
  }
  if (typeof window === 'undefined' || typeof window.open !== 'function') {
    setStatus(host, 'SVG preview unavailable');
    return;
  }
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=920,height=680');
  if (!popup) {
    setStatus(host, 'Popup blocked');
    return;
  }
  popup.document.write(previewHtml(svg.outerHTML));
  popup.document.close();
  setStatus(host, 'Opened SVG preview');
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
  return `<!doctype html><html><head><meta charset="utf-8"><title>PipeSpec SVG Preview</title><style>body{margin:0;background:#0b1120;color:#e5f0ff;font:14px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}.wrap{background:#fff;border-radius:18px;padding:18px;width:min(92vw,980px)}svg{width:100%;height:auto}</style></head><body><div class="wrap">${svgMarkup}</div></body></html>`;
}

function pulseButton(button, label) {
  const span = button.querySelector('span');
  if (!span) return;
  const previous = span.textContent;
  span.textContent = label;
  setTimeout(() => { span.textContent = previous; }, 1100);
}

function setStatus(host, text) {
  const status = host.querySelector('[data-detail-status]');
  if (status) status.textContent = esc(text);
}