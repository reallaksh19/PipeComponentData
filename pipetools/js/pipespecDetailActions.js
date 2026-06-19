const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function bindPipeSpecDetailActions(row) {
  const host = document.getElementById('inspector-body');
  if (!host || !row) return;
  const payload = JSON.stringify(row, null, 2);

  host.querySelectorAll('[data-detail-action]').forEach((button) => {
    button.addEventListener('click', () => runDetailAction(button.dataset.detailAction, { button, host, payload }));
  });
}

async function runDetailAction(action, context) {
  if (action === 'toggle-json') return toggleJson(context);
  if (action === 'copy-json') return copyJson(context);
  if (action === 'open-svg-preview') return openSvgPreview(context);
}

function toggleJson({ button, host }) {
  const details = host.querySelector('[data-detail-json]');
  if (!details) return;
  details.open = !details.open;
  button.setAttribute('aria-expanded', String(details.open));
  setStatus(host, details.open ? 'Detailed row JSON shown' : 'Detailed row JSON hidden');
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
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=720,height=520');
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
  return `<!doctype html><html><head><meta charset="utf-8"><title>PipeSpec SVG Preview</title><style>body{margin:0;background:#0b1120;color:#e5f0ff;font:14px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}.wrap{background:#fff;border-radius:18px;padding:18px;max-width:94vw}svg{max-width:100%;height:auto}</style></head><body><div class="wrap">${svgMarkup}</div></body></html>`;
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
