export { iconSvg, listIconKeys } from './svg/icons.js';
export { pipeSpanSvg } from './svg/pipeSpan.js';
export { getSvgRenderer, hasSvgRenderer, listSvgKeys, resolveSvgKey } from './svg/registry.js';
export { renderSvgPreview } from './svg/inspector.js';

export async function gateValveSvg(row = {}) {
  const mod = await import('./svg/inspector.js');
  return mod.renderSvgPreview(row);
}
