const STORAGE_KEY = 'pipetools.dxf.dimensionCalloutMode.v1';
const MODES = ['full', 'compact', 'off'];

export function getDimensionCalloutMode() {
  const stored = safeStorage()?.getItem(STORAGE_KEY);
  return MODES.includes(stored) ? stored : 'full';
}

export function setDimensionCalloutMode(mode) {
  const next = MODES.includes(mode) ? mode : 'full';
  safeStorage()?.setItem(STORAGE_KEY, next);
  return next;
}

export function cycleDimensionCalloutMode() {
  const current = getDimensionCalloutMode();
  const index = MODES.indexOf(current);
  return setDimensionCalloutMode(MODES[(index + 1) % MODES.length]);
}

export function dimensionCalloutModeLabel(mode = getDimensionCalloutMode()) {
  return ({ full: 'Callouts: Full', compact: 'Callouts: Compact', off: 'Callouts: Off' }[mode]) || 'Callouts: Full';
}

function safeStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
