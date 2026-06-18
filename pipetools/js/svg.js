export function iconSvg(key) {
  const base = {
    PIPE: '<ellipse cx="4" cy="10" rx="3" ry="6"/><path d="M4 4h14M4 16h14"/><ellipse cx="18" cy="10" rx="3" ry="6"/>',
    VALVE: '<path d="M2 12h4l6-5v10l-6-5M22 12h-4l-6-5v10l6-5"/><path d="M12 7V3"/><circle cx="12" cy="3" r="2"/>',
    FLANGE: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2"/>',
    FITTING: '<path d="M4 16h8a4 4 0 0 0 4-4V4"/><path d="M13 4h6M4 13v6"/>',
    GASKET: '<circle cx="12" cy="12" r="8" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="4"/>',
    SUPPORT: '<path d="M5 17h14M8 17V9l4-3 4 3v8M7 9h10"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${base[key] ?? base.PIPE}</svg>`;
}

export function gateValveSvg(row = {}) {
  const dims = row.dimensions ?? {};
  const f2f = dims.faceToFaceRfMm?.value ?? row.f2f ?? '---';
  const height = dims.heightMm?.value ?? row.height ?? '---';
  return `<div class="svg-card"><svg viewBox="0 0 420 250" role="img" aria-label="Gate valve SVG preview">
    <rect width="420" height="250" rx="16" fill="#07111f"/>
    <line x1="38" y1="138" x2="382" y2="138" stroke="#334155" stroke-dasharray="7 7"/>
    <rect x="58" y="96" width="28" height="84" rx="5" fill="none" stroke="#7dd3fc" stroke-width="3"/>
    <rect x="334" y="96" width="28" height="84" rx="5" fill="none" stroke="#7dd3fc" stroke-width="3"/>
    <path d="M86 98L170 138L86 178Z M334 98L250 138L334 178Z" fill="none" stroke="#e5f0ff" stroke-width="3"/>
    <path d="M184 112h52l18-42h-88z" fill="none" stroke="#e5f0ff" stroke-width="3"/>
    <line x1="210" y1="70" x2="210" y2="34" stroke="#e5f0ff" stroke-width="3"/>
    <circle cx="210" cy="30" r="22" fill="none" stroke="#7dd3fc" stroke-width="3"/>
    <path d="M188 30h44M210 8v44" stroke="#7dd3fc" stroke-width="2"/>
    <line x1="58" y1="212" x2="362" y2="212" stroke="#38bdf8" stroke-width="2"/>
    <path d="M58 200v24M362 200v24" stroke="#38bdf8" stroke-width="2"/>
    <text x="210" y="235" fill="#e0f2fe" text-anchor="middle" font-size="15">F2F RF ${f2f} mm</text>
    <line x1="392" y1="30" x2="392" y2="180" stroke="#38bdf8" stroke-width="2"/>
    <path d="M380 30h24M380 180h24" stroke="#38bdf8" stroke-width="2"/>
    <text x="383" y="112" fill="#e0f2fe" font-size="14" transform="rotate(-90 383 112)">H ${height} mm</text>
  </svg></div>`;
}

export function pipeSpanSvg(result) {
  const span = result?.governingSpanM ?? '---';
  return `<div class="svg-card"><svg viewBox="0 0 420 180" role="img" aria-label="Pipe span SVG preview">
    <rect width="420" height="180" rx="16" fill="#07111f"/>
    <path d="M55 78h310" stroke="#e5f0ff" stroke-width="18" stroke-linecap="round"/>
    <path d="M72 96v44M348 96v44M50 140h44M326 140h44" stroke="#7dd3fc" stroke-width="4" stroke-linecap="round"/>
    <path d="M72 150h276" stroke="#38bdf8" stroke-width="2"/>
    <path d="M72 136v26M348 136v26" stroke="#38bdf8" stroke-width="2"/>
    <text x="210" y="168" fill="#e0f2fe" text-anchor="middle" font-size="16">Governing span ${span} m</text>
  </svg></div>`;
}
