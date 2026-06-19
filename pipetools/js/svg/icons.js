const ICON_PATHS = {
  PIPE: '<ellipse cx="4" cy="10" rx="3" ry="6"/><path d="M4 4h14M4 16h14"/><ellipse cx="18" cy="10" rx="3" ry="6"/>',
  VALVE: '<path d="M2 12h4l6-5v10l-6-5M22 12h-4l-6-5v10l6-5"/><path d="M12 7V3"/><circle cx="12" cy="3" r="2"/>',
  FLANGE: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2"/>',
  FITTING: '<path d="M4 16h8a4 4 0 0 0 4-4V4"/><path d="M13 4h6M4 13v6"/>',
  GASKET: '<circle cx="12" cy="12" r="8" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="4"/>',
  SUPPORT: '<path d="M5 17h14M8 17V9l4-3 4 3v8M7 9h10"/>',
};

export function listIconKeys() {
  return Object.keys(ICON_PATHS);
}

export function iconSvg(key) {
  const path = ICON_PATHS[key] ?? ICON_PATHS.PIPE;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${path}</svg>`;
}
