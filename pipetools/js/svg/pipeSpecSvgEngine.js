import { hasPipeSpecSvgSupport, toPipeSpecSvgRow } from './pipeSpecSvgAdapter.js';

const ENGINE_SCRIPT_URL = new URL('../../vendor/pipespec-svg/svg-engine.js', import.meta.url).href;
let loadPromise;

export async function loadPipeSpecSvgEngine() {
  if (globalThis.PipeSpecSVG?.buildSVGString) return globalThis.PipeSpecSVG;
  if (typeof document === 'undefined') {
    throw new Error('PipeSpecSVG browser vendor script is not loaded');
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = ENGINE_SCRIPT_URL;
      script.async = true;
      script.dataset.pipetoolsVendor = 'pipespec-svg-engine';
      script.onload = () => globalThis.PipeSpecSVG?.buildSVGString
        ? resolve(globalThis.PipeSpecSVG)
        : reject(new Error('PipeSpecSVG global missing after vendor load'));
      script.onerror = () => reject(new Error(`Failed to load ${ENGINE_SCRIPT_URL}`));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

export async function buildPipeSpecSvgString(row, opts = {}) {
  if (!hasPipeSpecSvgSupport(row)) return '';
  const engine = await loadPipeSpecSvgEngine();
  return engine.buildSVGString(toPipeSpecSvgRow(row), opts);
}

export async function mountPipeSpecSvg(row, container, opts = {}) {
  if (!container) return false;
  if (!hasPipeSpecSvgSupport(row)) {
    container.innerHTML = '<div class="svg-unavailable">SVG not available for this component.</div>';
    return false;
  }
  const engine = await loadPipeSpecSvgEngine();
  engine.mount(toPipeSpecSvgRow(row), container, opts);
  return true;
}

export { hasPipeSpecSvgSupport, toPipeSpecSvgRow };
