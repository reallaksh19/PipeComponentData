import { SPL2_BUNDLE, bundleSummary, getBundleSrc } from './bundleConfig.js';

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (ch) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}[ch]));

export function renderBundleInfo(host, config = SPL2_BUNDLE) {
  host.innerHTML = `<section class="strip"><div class="strip-title">${esc(config.label)}</div>
    <div class="segment-row">
      <span class="chip">Static iframe boundary</span>
      <span class="chip">${esc(bundleSummary(config))}</span>
      <a class="chip" href="${esc(getBundleSrc(config))}" target="_blank" rel="noreferrer">Open full screen</a>
    </div>
  </section>`;
}

export function renderBundleMain(config = SPL2_BUNDLE) {
  const src = getBundleSrc(config);
  document.getElementById('table-title').textContent = config.label;
  document.getElementById('table-count').textContent = 'iframe';
  document.getElementById('table-frame').innerHTML = frameHtml(src, config.label);
  document.getElementById('inspector-body').innerHTML = inspectorHtml(config);
}

function frameHtml(src, title) {
  return `<iframe class="bundle-frame" src="${esc(src)}" title="${esc(title)}"></iframe>`;
}

function inspectorHtml(config) {
  return `<p>The SPL2 bundle is isolated as a static iframe. No PipeSpec or Pipe Span state is shared.</p>
    <div class="kv"><span>Source repo</span><strong>${esc(config.upstreamRepo)}</strong></div>
    <div class="kv"><span>Bundle path</span><strong>${esc(config.src)}</strong></div>`;
}
