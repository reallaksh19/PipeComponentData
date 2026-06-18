import { formatDimension } from './safe.js';

export function pipeSpanSvg(result = {}) {
  return formatDimension(result?.governingSpanM, 'm');
}
