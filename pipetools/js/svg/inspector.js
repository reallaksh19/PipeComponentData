import { renderFallback } from './general.js';
import { getSvgRenderer, hasSvgRenderer, resolveSvgKey } from './registry.js';
import { isUnsafeSvg } from './safe.js';

export function renderSvgPreview(row = {}, options = {}) {
  const svgKey = options.svgKey ?? resolveSvgKey(row);
  const renderer = getSvgRenderer(svgKey);
  const svg = renderer({ ...row, svgKey }, options);
  if (isUnsafeSvg(svg)) return renderFallback({ svgKey: 'unsafe-svg-blocked' });
  return hasSvgRenderer(svgKey) ? svg : renderFallback({ ...row, svgKey });
}
