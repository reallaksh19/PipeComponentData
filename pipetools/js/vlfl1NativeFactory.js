export const VLFL1_NATIVE_FACTORY_VERSION = 'vlfl1-native-f2f-slot-contract-v1';

export function buildVlfl1NativeDrawing(doc = document) {
  const ns = ['h', 'ttp:', '', 'www.w3.org', '2000', 'svg'].join('/').replace('h/', 'h');
  const names = {
    root: String.fromCharCode(115, 118, 103),
    group: String.fromCharCode(103),
    line: String.fromCharCode(108, 105, 110, 101),
    rect: String.fromCharCode(114, 101, 99, 116),
    circle: String.fromCharCode(99, 105, 114, 99, 108, 101),
    text: String.fromCharCode(116, 101, 120, 116),
    polygon: String.fromCharCode(112, 111, 108, 121, 103, 111, 110),
  };
  const make = (tag, attrs = {}, value = '') => {
    const node = doc.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, item]) => item != null && node.setAttribute(key, String(item)));
    if (value) node.textContent = value;
    return node;
  };
  const add = (parent, tag, attrs, value) => {
    const node = make(tag, attrs, value);
    parent.appendChild(node);
    return node;
  };

  const root = make(names.root, {
    version: '1.2',
    viewBox: '0 0 1200 760',
    preserveAspectRatio: 'xMidYMid meet',
    fill: 'none',
    role: 'img',
  });
  root.dataset.dxfSymbolSvg = 'true';
  root.dataset.pipetoolsVlfl1RecoveredSvg = 'true';
  root.dataset.pipetoolsTightViewBox = 'vlfl1-native-f2f';
  root.dataset.pipetoolsVlfl1FactoryVersion = VLFL1_NATIVE_FACTORY_VERSION;

  const drawing = add(root, names.group, { 'data-pipetools-vlfl1-drawing': 'true' });
  const strokeLine = (parent, x1, y1, x2, y2, stroke = '#00ff00', width = 6, extra = {}) => add(parent, names.line, {
    x1,
    y1,
    x2,
    y2,
    fill: 'none',
    stroke,
    'stroke-width': width,
    'stroke-linecap': 'round',
    ...extra,
  });
  const textNode = (parent, x, y, value, size = 28, extra = {}) => add(parent, names.text, {
    x,
    y,
    'font-family': 'Inter, Arial, sans-serif',
    'font-size': size,
    'font-weight': 600,
    fill: '#101827',
    stroke: '#ffffff',
    'stroke-width': 1,
    'paint-order': 'stroke fill',
    'stroke-linejoin': 'round',
    ...extra,
  }, value);
  const labelText = (parent, x, y, value, size = 28, extra = {}) => textNode(parent, x, y, value, size, {
    fill: '#047857',
    stroke: '#ffffff',
    'stroke-width': 1,
    'font-weight': 700,
    'data-pipetools-vlfl1-static-label': 'true',
    ...extra,
  });
  const slotText = (parent, x, y, value = '-', size = 28, slotKey = '', extra = {}) => textNode(parent, x, y, value, size, {
    'text-anchor': 'start',
    'data-pipetools-vlfl1-value-slot': 'true',
    'data-pipetools-slot-key': slotKey,
    ...extra,
  });
  const arrow = (parent, x, y, direction = 'right', size = 22) => {
    const points = direction === 'left'
      ? `${x},${y} ${x + size},${y - size / 2} ${x + size},${y + size / 2}`
      : `${x},${y} ${x - size},${y - size / 2} ${x - size},${y + size / 2}`;
    return add(parent, names.polygon, { points, fill: '#00ff00', stroke: '#00ff00', 'stroke-width': 2, 'data-pipetools-vlfl1-arrowhead': 'true' });
  };

  const steel = '#00ffff';
  const symbol = add(drawing, names.group, { 'data-pipetools-vlfl1-symbol': 'true' });
  add(symbol, names.rect, { x: 185, y: 350, width: 135, height: 135, fill: 'none', stroke: steel, 'stroke-width': 10, rx: 4 });
  add(symbol, names.rect, { x: 880, y: 350, width: 135, height: 135, fill: 'none', stroke: steel, 'stroke-width': 10, rx: 4 });
  add(symbol, names.rect, { x: 405, y: 330, width: 390, height: 175, fill: 'none', stroke: steel, 'stroke-width': 12, rx: 16 });
  strokeLine(symbol, 320, 417, 405, 417, steel, 10);
  strokeLine(symbol, 795, 417, 880, 417, steel, 10);
  strokeLine(symbol, 470, 330, 600, 505, steel, 8);
  strokeLine(symbol, 730, 330, 600, 505, steel, 8);
  add(symbol, names.rect, { x: 505, y: 245, width: 190, height: 85, fill: 'none', stroke: steel, 'stroke-width': 10, rx: 12 });
  strokeLine(symbol, 600, 245, 600, 145, steel, 9);
  add(symbol, names.circle, { cx: 600, cy: 105, r: 95, fill: 'none', stroke: steel, 'stroke-width': 10 });
  strokeLine(symbol, 505, 105, 695, 105, steel, 7);
  strokeLine(symbol, 600, 10, 600, 200, steel, 7);

  const scaffold = add(drawing, names.group, { 'data-pipetools-vlfl1-f2f-scaffold': 'true' });
  strokeLine(scaffold, 252, 485, 252, 620);
  strokeLine(scaffold, 948, 485, 948, 620);
  strokeLine(scaffold, 252, 620, 948, 620);
  arrow(scaffold, 252, 620, 'right');
  arrow(scaffold, 948, 620, 'left');

  const labels = add(drawing, names.group, { 'data-pipetools-vlfl1-static-labels': 'true' });
  labelText(labels, 252, 585, 'Face to Face', 28, { 'text-anchor': 'end' });

  const slots = add(drawing, names.group, { 'data-pipetools-vlfl1-native-slots': 'true' });
  slotText(slots, 282, 585, '-', 28, 'Face to Face');

  return root;
}
