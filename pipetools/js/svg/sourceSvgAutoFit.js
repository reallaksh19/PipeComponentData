const AUTO_FIT_PADDING = 34;
const AUTO_FIT_MIN_SCALE = 0.28;
const AUTO_FIT_MAX_SCALE = 1.0;
const AUTO_FIT_FALLBACK = Object.freeze({ panX: '0px', panY: '0px', scale: 0.9, source: 'auto-fit-fallback' });

export function computeAutoSourceSvgOffset(container) {
  const canvas = container?.closest?.('.source-svg-canvas');
  const viewport = container?.querySelector?.('.source-svg-viewport');
  if (!canvas || !viewport) return { ...AUTO_FIT_FALLBACK };

  const previousTransform = viewport.style.getPropertyValue('transform');
  const previousPriority = viewport.style.getPropertyPriority('transform');
  viewport.style.setProperty('transform', 'none', 'important');

  const canvasRect = canvas.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();

  if (previousTransform) viewport.style.setProperty('transform', previousTransform, previousPriority || '');
  else viewport.style.removeProperty('transform');

  if (!usableRect(canvasRect) || !usableRect(viewportRect)) return { ...AUTO_FIT_FALLBACK };

  const availableWidth = Math.max(canvasRect.width - AUTO_FIT_PADDING * 2, canvasRect.width * 0.45);
  const availableHeight = Math.max(canvasRect.height - AUTO_FIT_PADDING * 2, canvasRect.height * 0.45);
  const scale = clamp(Math.min(availableWidth / viewportRect.width, availableHeight / viewportRect.height), AUTO_FIT_MIN_SCALE, AUTO_FIT_MAX_SCALE);
  const panX = Math.round((canvasRect.left + canvasRect.width / 2) - (viewportRect.left + viewportRect.width / 2));
  const panY = Math.round((canvasRect.top + canvasRect.height / 2) - (viewportRect.top + viewportRect.height / 2));

  return {
    panX: `${panX}px`,
    panY: `${panY}px`,
    scale: Math.round(scale * 1000) / 1000,
    source: 'auto-fit-measured'
  };
}

function usableRect(rect) {
  return rect && Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 1 && rect.height > 1;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return AUTO_FIT_FALLBACK.scale;
  return Math.min(max, Math.max(min, value));
}
