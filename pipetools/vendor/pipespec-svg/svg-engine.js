/**
 * PipeSpec SVG Engine v1.1
 * Source-vendored drawing contract from uploaded PipeSpec package.
 * Supports component-specific symbols for pipe, valve, flange, fitting, gasket, and reducer.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PipeSpecSVG = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_W = 390;
  const DEFAULT_H = 262;
  const T = {
    BF: '#EFF6FF',
    BF2: '#DBEAFE',
    BD: '#1E293B',
    DC: '#2563EB',
    CLC: '#94A3B8',
    MF: "'DM Mono', 'Courier New', monospace",
  };

  function esc(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fv(value, unit) {
    if (value == null || value === '') return '—';
    const num = Number(value);
    const text = Number.isFinite(num) ? (num % 1 === 0 ? String(num) : num.toFixed(num < 10 ? 2 : 1)) : String(value);
    return unit ? `${text} ${unit}` : text;
  }

  function uid(row) {
    return ('p' + (row.id || row.componentType || Math.random())).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  }

  function tag(name, attrs, ...children) {
    const attrStr = Object.entries(attrs || {}).filter(([, value]) => value != null && value !== false).map(([key, value]) => `${key}="${esc(value)}"`).join(' ');
    const inner = children.flat(Infinity).filter(Boolean).join('');
    const empty = ['line', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'path'].includes(name);
    if (!inner && empty) return `<${name} ${attrStr}/>`;
    return `<${name} ${attrStr}>${inner}</${name}>`;
  }

  function defs(aid, hid) {
    return tag('defs', {},
      tag('marker', { id: aid, markerWidth: 7, markerHeight: 6, refX: 6, refY: 3, orient: 'auto' }, tag('polygon', { points: '0,0 7,3 0,6', fill: T.DC })),
      tag('marker', { id: `${aid}s`, markerWidth: 7, markerHeight: 6, refX: 1, refY: 3, orient: 'auto-start-reverse' }, tag('polygon', { points: '0,0 7,3 0,6', fill: T.DC })),
      tag('pattern', { id: hid, width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, tag('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: '#7BA7CC', 'stroke-width': 1.2 }))
    );
  }

  function title(text, W, H) {
    return tag('g', {}, tag('rect', { x: 0, y: H - 22, width: W, height: 22, fill: '#F1F5F9', stroke: '#E2E8F0' }), tag('text', { x: W / 2, y: H - 8, 'text-anchor': 'middle', fill: '#64748B', 'font-size': 8, 'font-family': T.MF }, esc(text)));
  }

  function centre(x1, y1, x2, y2) {
    return tag('line', { x1, y1, x2, y2, stroke: T.CLC, 'stroke-width': 0.8, 'stroke-dasharray': '9,3,2,3' });
  }

  function label(x, y, text, anchor = 'middle') {
    return tag('text', { x, y, 'text-anchor': anchor, fill: T.DC, 'font-size': 8.5, 'font-family': T.MF, 'font-weight': 700 }, esc(text));
  }

  function dim(x1, x2, y, text, aid) {
    return tag('g', {}, tag('line', { x1, y1: y, x2, y2: y, stroke: T.DC, 'marker-start': `url(#${aid}s)`, 'marker-end': `url(#${aid})` }), label((x1 + x2) / 2, y - 5, text));
  }

  function leader(x, y, text, right) {
    const x2 = x + (right ? 38 : -38);
    return tag('g', {}, tag('circle', { cx: x, cy: y, r: 2.5, fill: T.DC }), tag('polyline', { points: `${x},${y} ${x2},${y - 18} ${x2 + (right ? 22 : -22)},${y - 18}`, fill: 'none', stroke: T.DC }), label(x2 + (right ? 26 : -26), y - 15, text, right ? 'start' : 'end'));
  }

  function pipeEnds(y, W) {
    return tag('g', {},
      centre(34, y, W - 34, y),
      tag('rect', { x: 62, y: y - 20, width: 54, height: 40, fill: T.BF2, stroke: T.BD, 'stroke-width': 1.4 }),
      tag('rect', { x: W - 116, y: y - 20, width: 54, height: 40, fill: T.BF2, stroke: T.BD, 'stroke-width': 1.4 })
    );
  }

  function valveTitle(row, type, W, H) {
    return title(`${type} VALVE · NPS ${row.nps} · CL ${row.classRating} · ${row.facing || 'RF'}`, W, H);
  }

  function renderPipe(row, W, H, aid, hid) {
    const y = H / 2 - 12;
    return tag('g', {}, centre(44, y, W - 44, y), tag('rect', { x: 60, y: y - 26, width: W - 120, height: 52, rx: 26, fill: T.BF, stroke: T.BD, 'stroke-width': 1.5 }), tag('rect', { x: 60, y: y - 26, width: W - 120, height: 52, rx: 26, fill: `url(#${hid})`, opacity: 0.45 }), tag('line', { x1: 76, y1: y - 15, x2: W - 76, y2: y - 15, stroke: T.BD, 'stroke-dasharray': '5,4' }), tag('line', { x1: 76, y1: y + 15, x2: W - 76, y2: y + 15, stroke: T.BD, 'stroke-dasharray': '5,4' }), leader(96, y - 26, `OD ${fv(row.odMm, 'mm')}`, true), leader(W - 96, y + 2, `Wall ${fv(row.wallMm, 'mm')}`, false), dim(60, W - 60, y + 50, `Wt ${fv(row.weightKgPerM, 'kg/m')}`, aid), title(`PIPE · NPS ${row.nps} (DN ${row.dn}) · SCH ${row.schedule} · ${row.standard || ''}`, W, H));
  }

  function renderGateValve(row, W, H, aid) {
    const y = H / 2 + 8;
    const cx = W / 2;
    return tag('g', {}, pipeEnds(y, W), tag('polygon', { points: `${116},${y - 36} ${cx},${y - 8} ${W - 116},${y - 36} ${W - 116},${y + 36} ${cx},${y + 8} ${116},${y + 36}`, fill: T.BF, stroke: T.BD, 'stroke-width': 1.5 }), tag('rect', { x: cx - 18, y: y - 64, width: 36, height: 56, fill: T.BF2, stroke: T.BD, 'stroke-width': 1.2 }), tag('line', { x1: cx, y1: y - 64, x2: cx, y2: y - 92, stroke: T.BD, 'stroke-width': 1.4 }), tag('circle', { cx, cy: y - 104, r: 25, fill: 'none', stroke: T.BD, 'stroke-width': 2 }), leader(cx, y - 104, `HW ${fv(row.handwheelDiaMm, 'mm')}`, true), leader(cx + 18, y - 44, `H ${fv(row.heightMm, 'mm')}`, true), dim(62, W - 62, y + 58, `F-F ${fv(row.faceToFaceRfMm, 'mm')}`, aid), valveTitle(row, 'GATE', W, H));
  }

  function renderGlobeValve(row, W, H, aid) {
    const y = H / 2 + 12;
    const cx = W / 2;
    return tag('g', {}, pipeEnds(y, W), tag('ellipse', { cx, cy: y, rx: 86, ry: 50, fill: T.BF, stroke: T.BD, 'stroke-width': 1.6 }), tag('path', { d: `M${cx - 58},${y + 24} C${cx - 24},${y - 10} ${cx + 22},${y + 18} ${cx + 58},${y - 24}`, fill: 'none', stroke: T.BD, 'stroke-width': 2.2 }), tag('line', { x1: cx, y1: y - 50, x2: cx, y2: y - 92, stroke: T.BD, 'stroke-width': 1.5 }), tag('circle', { cx, cy: y - 104, r: 23, fill: 'none', stroke: T.BD, 'stroke-width': 2 }), leader(cx + 48, y - 35, `H ${fv(row.heightMm, 'mm')}`, true), dim(62, W - 62, y + 64, `F-F ${fv(row.faceToFaceRfMm, 'mm')}`, aid), valveTitle(row, 'GLOBE', W, H));
  }

  function renderBallValve(row, W, H, aid) {
    const y = H / 2 + 10;
    const cx = W / 2;
    return tag('g', {}, pipeEnds(y, W), tag('circle', { cx, cy: y, r: 52, fill: T.BF, stroke: T.BD, 'stroke-width': 1.6 }), tag('circle', { cx, cy: y, r: 24, fill: 'white', stroke: T.BD, 'stroke-width': 1.3 }), tag('line', { x1: cx - 18, y1: y + 18, x2: cx + 18, y2: y - 18, stroke: T.BD, 'stroke-width': 2 }), tag('line', { x1: cx, y1: y - 52, x2: cx, y2: y - 86, stroke: T.BD, 'stroke-width': 1.4 }), tag('line', { x1: cx, y1: y - 86, x2: cx + 74, y2: y - 104, stroke: T.BD, 'stroke-width': 4, 'stroke-linecap': 'round' }), leader(cx, y - 52, `H ${fv(row.heightMm, 'mm')}`, true), dim(62, W - 62, y + 64, `F-F ${fv(row.faceToFaceRfMm, 'mm')}`, aid), valveTitle(row, 'BALL', W, H));
  }

  function renderCheckValve(row, W, H, aid) {
    const y = H / 2 + 8;
    const cx = W / 2;
    return tag('g', {}, pipeEnds(y, W), tag('path', { d: `M${cx - 86},${y - 42} H${cx + 76} L${cx + 94},${y} L${cx + 76},${y + 42} H${cx - 86} Z`, fill: T.BF, stroke: T.BD, 'stroke-width': 1.6 }), tag('line', { x1: cx - 28, y1: y - 34, x2: cx + 28, y2: y + 28, stroke: T.BD, 'stroke-width': 3 }), tag('circle', { cx: cx - 36, cy: y - 36, r: 4, fill: T.BD }), tag('polyline', { points: `${cx - 68},${y} ${cx - 16},${y} ${cx - 28},${y - 10} ${cx - 16},${y} ${cx - 28},${y + 10}`, fill: 'none', stroke: T.DC, 'stroke-width': 2 }), leader(cx + 56, y - 42, `H ${fv(row.heightMm, 'mm')}`, true), dim(62, W - 62, y + 62, `F-F ${fv(row.faceToFaceRfMm, 'mm')}`, aid), valveTitle(row, row.valveType === 'SWING_CHECK' ? 'SWING CHECK' : 'CHECK', W, H));
  }

  function renderButterflyValve(row, W, H, aid) {
    const y = H / 2 + 10;
    const cx = W / 2;
    return tag('g', {}, pipeEnds(y, W), tag('rect', { x: cx - 34, y: y - 58, width: 68, height: 116, rx: 18, fill: T.BF, stroke: T.BD, 'stroke-width': 1.6 }), tag('ellipse', { cx, cy: y, rx: 28, ry: 54, fill: 'white', stroke: T.BD, 'stroke-width': 1.2 }), tag('line', { x1: cx - 22, y1: y + 44, x2: cx + 22, y2: y - 44, stroke: T.BD, 'stroke-width': 3 }), tag('line', { x1: cx, y1: y - 58, x2: cx, y2: y - 92, stroke: T.BD, 'stroke-width': 1.4 }), tag('line', { x1: cx, y1: y - 92, x2: cx + 56, y2: y - 100, stroke: T.BD, 'stroke-width': 3, 'stroke-linecap': 'round' }), leader(cx + 34, y - 46, `H ${fv(row.heightMm, 'mm')}`, true), dim(62, W - 62, y + 64, `F-F ${fv(row.faceToFaceRfMm, 'mm')}`, aid), valveTitle(row, 'BUTTERFLY', W, H));
  }

  function renderValve(row, W, H, aid) {
    if (row.valveType === 'GLOBE') return renderGlobeValve(row, W, H, aid);
    if (row.valveType === 'BALL') return renderBallValve(row, W, H, aid);
    if (row.valveType === 'SWING_CHECK' || row.valveType === 'CHECK') return renderCheckValve(row, W, H, aid);
    if (row.valveType === 'BUTTERFLY') return renderButterflyValve(row, W, H, aid);
    return renderGateValve(row, W, H, aid);
  }

  function renderFlange(row, W, H, aid, hid) {
    const y = H / 2 - 4;
    const cx = W / 2;
    const face = cx + 28;
    return tag('g', {}, centre(40, y, W - 40, y), tag('rect', { x: cx - 54, y: y - 62, width: 88, height: 124, fill: T.BF, stroke: T.BD, 'stroke-width': 1.5 }), tag('rect', { x: cx - 54, y: y - 62, width: 88, height: 124, fill: `url(#${hid})`, opacity: 0.42 }), row.subtype === 'WN' ? tag('polygon', { points: `${cx - 54},${y - 28} ${cx - 104},${y - 15} ${cx - 104},${y + 15} ${cx - 54},${y + 28}`, fill: T.BF2, stroke: T.BD }) : '', row.subtype === 'BLIND' ? tag('rect', { x: cx - 20, y: y - 46, width: 54, height: 92, fill: T.BF2, stroke: T.BD }) : '', tag('rect', { x: face, y: y - 44, width: 10, height: 88, fill: T.BF2, stroke: T.BD }), tag('circle', { cx: cx - 12, cy: y - 42, r: 3, fill: T.DC }), tag('circle', { cx: cx - 12, cy: y + 42, r: 3, fill: T.DC }), leader(cx - 54, y - 62, `OD ${fv(row.flangeOdMm, 'mm')}`, false), leader(face, y - 44, `RF ${fv(row.rfDiaMm, 'mm')}`, true), dim(cx - 54, face + 10, y + 78, `T ${fv(row.flangeThicknessMm, 'mm')}`, aid), title(`${row.subtype || 'FLANGE'} FLANGE · NPS ${row.nps} · CL ${row.classRating} · ${row.standard || ''}`, W, H));
  }

  function renderElbow(row, W, H, aid, hid, angle) {
    const cx = W / 2 - 20;
    const cy = H / 2 + 12;
    const r = 78;
    const end = angle === 45 ? `${cx + 66},${cy - 38}` : `${cx + r},${cy - r}`;
    const path = angle === 45 ? `M${cx - 82},${cy + 24} Q${cx - 10},${cy + 18} ${end} L${cx + 54},${cy - 68} Q${cx - 8},${cy - 20} ${cx - 82},${cy - 26} Z` : `M${cx - 82},${cy + 24} Q${cx + 78},${cy + 28} ${cx + 86},${cy - 82} L${cx + 38},${cy - 82} Q${cx + 26},${cy - 24} ${cx - 82},${cy - 26} Z`;
    return tag('g', {}, centre(cx - 92, cy, cx + 104, cy), centre(cx + r, cy + 34, cx + r, cy - 94), tag('path', { d: path, fill: T.BF, stroke: T.BD, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }), tag('path', { d: path, fill: `url(#${hid})`, opacity: 0.42 }), leader(cx - 34, cy - 34, `OD ${fv(row.odMm, 'mm')}`, false), leader(cx + 38, cy - 50, `B ${fv(row.ctrToEndMm, 'mm')}`, true), dim(cx - 82, cx + 78, cy + 54, `${angle}° ELBOW`, aid), title(`${angle}° ELBOW · NPS ${row.nps} · SCH ${row.schedule} · ${row.standard || ''}`, W, H));
  }

  function renderTee(row, W, H, aid, hid) {
    const cx = W / 2;
    const y = H / 2 + 8;
    return tag('g', {}, centre(52, y, W - 52, y), centre(cx, 48, cx, y + 52), tag('path', { d: `M72,${y - 28} H${cx - 28} V54 H${cx + 28} V${y - 28} H${W - 72} V${y + 28} H72 Z`, fill: T.BF, stroke: T.BD, 'stroke-width': 1.5 }), tag('path', { d: `M72,${y - 28} H${cx - 28} V54 H${cx + 28} V${y - 28} H${W - 72} V${y + 28} H72 Z`, fill: `url(#${hid})`, opacity: 0.42 }), leader(cx, 54, `B ${fv(row.ctrToEndMm, 'mm')}`, true), leader(W - 90, y - 28, `OD ${fv(row.odMm, 'mm')}`, true), dim(72, W - 72, y + 52, `Run ${fv(row.ctrToEndMm ? row.ctrToEndMm * 2 : null, 'mm')}`, aid), title(`STRAIGHT TEE · NPS ${row.nps} · SCH ${row.schedule} · ${row.standard || ''}`, W, H));
  }

  function renderCap(row, W, H, aid, hid) {
    const y = H / 2;
    const x = W / 2 - 70;
    return tag('g', {}, centre(x - 20, y, x + 170, y), tag('path', { d: `M${x},${y - 44} H${x + 112} A44,44 0 0 1 ${x + 112},${y + 44} H${x} Z`, fill: T.BF, stroke: T.BD, 'stroke-width': 1.5 }), tag('path', { d: `M${x},${y - 44} H${x + 112} A44,44 0 0 1 ${x + 112},${y + 44} H${x} Z`, fill: `url(#${hid})`, opacity: 0.42 }), leader(x, y - 44, `OD ${fv(row.odMm, 'mm')}`, false), dim(x, x + 145, y + 62, `L ${fv(row.overCapMm, 'mm')}`, aid), title(`CAP · NPS ${row.nps} · SCH ${row.schedule} · ${row.standard || ''}`, W, H));
  }

  function renderReducer(row, W, H, aid, hid) {
    const y = H / 2 + 4;
    const x1 = 74;
    const x2 = W - 74;
    const big = 54;
    const small = 30;
    const eccentricDrop = row.reducerType === 'ECCENTRIC' ? 20 : 0;
    const points = `${x1},${y - big} ${x2},${y - small + eccentricDrop} ${x2},${y + small + eccentricDrop} ${x1},${y + big}`;
    return tag('g', {}, centre(42, y, W - 42, y + eccentricDrop / 2), tag('polygon', { points, fill: T.BF, stroke: T.BD, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }), tag('polygon', { points, fill: `url(#${hid})`, opacity: 0.42 }), tag('ellipse', { cx: x1, cy: y, rx: 10, ry: big, fill: 'none', stroke: T.BD }), tag('ellipse', { cx: x2, cy: y + eccentricDrop, rx: 8, ry: small, fill: 'none', stroke: T.BD }), leader(x1, y - big, `Large ${fv(row.largeOdMm, 'mm')}`, false), leader(x2, y - small + eccentricDrop, `Small ${fv(row.smallOdMm, 'mm')}`, true), dim(x1, x2, y + 72, `L ${fv(row.centerToEndMm, 'mm')}`, aid), title(`${row.reducerType || 'REDUCER'} REDUCER · ${row.largeNps || '?'} × ${row.smallNps || '?'} · SCH ${row.schedule || ''}`, W, H));
  }

  function renderGasket(row, W, H, aid, hid) {
    const cx = W / 2 - 24;
    const cy = H / 2 - 8;
    return tag('g', {}, centre(cx - 82, cy, cx + 82, cy), centre(cx, cy - 82, cx, cy + 82), tag('circle', { cx, cy, r: 62, fill: T.BF, stroke: T.BD, 'stroke-width': 1.5 }), tag('circle', { cx, cy, r: 62, fill: `url(#${hid})`, opacity: 0.42 }), tag('circle', { cx, cy, r: 35, fill: 'white', stroke: T.BD, 'stroke-width': 1.2 }), row.subtype === 'SPIRAL_WOUND' ? tag('circle', { cx, cy, r: 49, fill: 'none', stroke: '#93C5FD', 'stroke-width': 1 }) : '', leader(cx + 62, cy, `OD ${fv(row.outerDiaMm, 'mm')}`, true), leader(cx - 35, cy, `ID ${fv(row.innerDiaMm, 'mm')}`, false), dim(cx - 62, cx + 62, cy + 78, `T ${fv(row.thicknessMm, 'mm')}`, aid), title(`${row.subtype || 'GASKET'} GASKET · ${row.standard || ''}`, W, H));
  }

  function renderUnknown(row, W, H) {
    return tag('g', {}, tag('text', { x: W / 2, y: H / 2 - 6, 'text-anchor': 'middle', fill: T.CLC, 'font-size': 12, 'font-family': T.MF }, esc(`${row.componentType || 'UNKNOWN'} · ${row.subtype || row.valveType || row.reducerType || ''}`)), tag('text', { x: W / 2, y: H / 2 + 12, 'text-anchor': 'middle', fill: '#CBD5E1', 'font-size': 9, 'font-family': T.MF }, 'No drawing available for this type'), title(row.id || 'UNKNOWN', W, H));
  }

  function buildSVGString(row, opts) {
    const W = opts && opts.width || DEFAULT_W;
    const H = opts && opts.height || DEFAULT_H;
    const id = uid(row || {});
    const aid = 'ar' + id;
    const hid = 'ht' + id;
    let inner = '';
    const safeRow = row || {};
    if (safeRow.componentType === 'PIPE') inner = renderPipe(safeRow, W, H, aid, hid);
    else if (safeRow.componentType === 'VALVE') inner = renderValve(safeRow, W, H, aid, hid);
    else if (safeRow.componentType === 'FLANGE') inner = renderFlange(safeRow, W, H, aid, hid);
    else if (safeRow.componentType === 'GASKET') inner = renderGasket(safeRow, W, H, aid, hid);
    else if (safeRow.componentType === 'REDUCER') inner = renderReducer(safeRow, W, H, aid, hid);
    else if (safeRow.componentType === 'FITTING' && safeRow.subtype === 'ELBOW_90') inner = renderElbow(safeRow, W, H, aid, hid, 90);
    else if (safeRow.componentType === 'FITTING' && safeRow.subtype === 'ELBOW_45') inner = renderElbow(safeRow, W, H, aid, hid, 45);
    else if (safeRow.componentType === 'FITTING' && safeRow.subtype === 'TEE_STRAIGHT') inner = renderTee(safeRow, W, H, aid, hid);
    else if (safeRow.componentType === 'FITTING' && safeRow.subtype === 'CAP') inner = renderCap(safeRow, W, H, aid, hid);
    else inner = renderUnknown(safeRow, W, H);
    return tag('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, xmlns: 'http://www.w3.org/2000/svg', style: 'display:block;font-family:sans-serif' }, defs(aid, hid), tag('rect', { x: 0, y: 0, width: W, height: H, fill: '#F8FAFC' }), tag('rect', { x: 0, y: 0, width: W, height: H, fill: 'none', stroke: '#E2E8F0' }), inner);
  }

  function mount(row, container, opts) {
    if (!container) throw new Error('PipeSpecSVG.mount: container is null');
    container.innerHTML = buildSVGString(row, opts);
  }

  function buildSVGElement(row, opts) {
    const str = buildSVGString(row, opts);
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, 'image/svg+xml');
    return document.adoptNode(doc.documentElement);
  }

  return { buildSVGString, mount, buildSVGElement };
}));
