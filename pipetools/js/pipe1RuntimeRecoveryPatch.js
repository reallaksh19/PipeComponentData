import { buildPipe1NativeDrawing, PIPE1_NATIVE_FACTORY_VERSION } from './pipe1NativeFactory.js?v=pipe1-runtime-recovery-20260622b';

const PATCH_VERSION = 'pipe1-runtime-recovery-20260622b';
const OPENOFFICE_NAMESPACE = 'xml.openoffice.org/svg/export';

function isPipe1Panel() {
  const kicker = document.getElementById('source-svg-kicker')?.textContent || '';
  const title = document.getElementById('source-svg-title')?.textContent || '';
  return /\bPipe1\b/i.test(kicker) || /\bPIPE\b/i.test(kicker) || /Pipe by Schedule/i.test(title) || /PIPE\s*\/\s*PIPE/i.test(title);
}

function isConvertedOpenOfficeSvg(svg) {
  if (!svg) return false;
  return svg.outerHTML.includes(OPENOFFICE_NAMESPACE) || Array.from(svg.attributes || []).some((attr) => String(attr.value || '').includes(OPENOFFICE_NAMESPACE));
}

function buildMeta() {
  const meta = document.createElement('div');
  meta.className = 'source-svg-meta';
  meta.dataset.pipe1RuntimeRecoveryPatch = PATCH_VERSION;
  meta.textContent = `DXF Pipe1 · PIPE · PIPE · native runtime recovery · ${PIPE1_NATIVE_FACTORY_VERSION}`;
  return meta;
}

function clearLegacyTransform(svg) {
  svg.style.removeProperty('transform');
  svg.style.removeProperty('transform-origin');
  const panel = document.getElementById('source-svg-panel');
  if (panel) {
    panel.dataset.svgScale = '1';
    panel.dataset.svgPanX = '0';
    panel.dataset.svgPanY = '0';
    panel.style.setProperty('--source-svg-scale', '1');
    panel.style.setProperty('--source-svg-pan-x', '0');
    panel.style.setProperty('--source-svg-pan-y', '0');
  }
}

function recoverPipe1Svg() {
  if (!isPipe1Panel()) return false;
  const host = document.querySelector('[data-pipespec-source-svg-host="true"]');
  const svg = host?.querySelector?.('[data-dxf-symbol-svg]');
  if (!svg || svg.dataset.pipetoolsPipe1RecoveredSvg === 'true') return false;
  if (!isConvertedOpenOfficeSvg(svg)) return false;

  const nativeSvg = buildPipe1NativeDrawing(document);
  nativeSvg.dataset.pipe1RuntimeRecoveryPatch = PATCH_VERSION;
  clearLegacyTransform(nativeSvg);
  host.replaceChildren(nativeSvg);

  const existingMeta = host.parentElement?.querySelector?.('.source-svg-meta');
  const meta = buildMeta();
  if (existingMeta) existingMeta.replaceWith(meta);
  else host.parentElement?.appendChild?.(meta);

  const kicker = document.getElementById('source-svg-kicker');
  if (kicker) kicker.textContent = `Pipe1 · PIPE · native runtime recovery · ${PATCH_VERSION}`;
  return true;
}

function scheduleRecover() {
  requestAnimationFrame(() => requestAnimationFrame(recoverPipe1Svg));
}

scheduleRecover();
new MutationObserver(scheduleRecover).observe(document.getElementById('source-svg-body') || document.body, { childList: true, subtree: true });

globalThis.PipeToolsPipe1RuntimeRecovery = Object.freeze({
  version: PATCH_VERSION,
  recover: recoverPipe1Svg,
});
