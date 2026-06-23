export const PIPE1_NATIVE_FACTORY_VERSION = 'pipe1-native-slot-contract-v12-inline-labels-no-underlines';

export function buildPipe1NativeDrawing(doc = document) {
  const ns = ['h', 'ttp:', '', 'www.w3.org', '2000', 'svg'].join('/').replace('h/', 'h');
  const names = {
    root: String.fromCharCode(115, 118, 103),
    group: String.fromCharCode(103),
    line: String.fromCharCode(108, 105, 110, 101),
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
    viewBox: '5000 12750 5250 4100',
    preserveAspectRatio: 'xMidYMid meet',
    fill: 'none',
    role: 'img',
  });
  root.dataset.dxfSymbolSvg = 'true';
  root.dataset.pipetoolsPipe1RecoveredSvg = 'true';
  root.dataset.pipetoolsTightViewBox = 'pipe1-native-recovered';
  root.dataset.pipetoolsPipe1FactoryVersion = PIPE1_NATIVE_FACTORY_VERSION;

  const drawing = add(root, names.group, { 'data-pipetools-pipe1-drawing': 'true' });
  const strokeLine = (parent, x1, y1, x2, y2, stroke = '#00ff00', width = 28, extra = {}) => add(parent, names.line, {
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
  const textNode = (parent, x, y, value, size = 110, extra = {}) => add(parent, names.text, {
    x,
    y,
    'font-family': 'Inter, Arial, sans-serif',
    'font-size': size,
    'font-weight': 600,
    fill: '#101827',
    stroke: '#ffffff',
    'stroke-width': 2,
    'paint-order': 'stroke fill',
    'stroke-linejoin': 'round',
    ...extra,
  }, value);
  const labelText = (parent, x, y, value, size = 110, extra = {}) => textNode(parent, x, y, value, size, {
    fill: '#047857',
    stroke: '#ffffff',
    'stroke-width': 2,
    'font-weight': 700,
    'data-pipetools-pipe1-static-label': 'true',
    ...extra,
  });
  const slotText = (parent, x, y, value = '-', size = 110, slotKey = '', extra = {}) => textNode(parent, x, y, value, size, {
    'text-anchor': 'middle',
    'data-pipetools-pipe1-value-slot': 'true',
    'data-pipetools-slot-key': slotKey,
    ...extra,
  });
  const arrow = (parent, x, y, direction = 'right', size = 70) => {
    const points = direction === 'left'
      ? `${x},${y} ${x + size},${y - size / 2} ${x + size},${y + size / 2}`
      : `${x},${y} ${x - size},${y - size / 2} ${x - size},${y + size / 2}`;
    return add(parent, names.polygon, { points, fill: '#00ff00', stroke: '#00ff00', 'stroke-width': 8, 'data-pipetools-pipe1-arrowhead': 'true' });
  };

  const ring = add(drawing, names.group, { 'data-pipetools-pipe-ring': 'true' });
  add(ring, names.circle, { cx: 7295, cy: 14491, r: 720, fill: 'none', stroke: '#00ffff', 'stroke-width': 34 });
  add(ring, names.circle, { cx: 7295, cy: 14491, r: 515, fill: 'none', stroke: '#00ffff', 'stroke-width': 30 });
  strokeLine(ring, 6425, 14491, 8185, 14491, '#00ffff', 22, { 'stroke-dasharray': '120 80' });
  strokeLine(ring, 7295, 13620, 7295, 15360, '#00ffff', 22, { 'stroke-dasharray': '120 80' });

  const scaffold = add(drawing, names.group, { 'data-pipetools-pipe1-dimension-scaffold': 'true' });
  strokeLine(scaffold, 6405, 13414, 8160, 13414);
  strokeLine(scaffold, 6578, 13835, 6578, 14320);
  strokeLine(scaffold, 8012, 13359, 8012, 14312);
  arrow(scaffold, 6600, 13414, 'right');
  arrow(scaffold, 7985, 13414, 'left');
  strokeLine(scaffold, 6405, 15588, 8160, 15588);
  strokeLine(scaffold, 6664, 14638, 6664, 15588);
  strokeLine(scaffold, 7926, 14626, 7926, 15588);
  arrow(scaffold, 6685, 15588, 'right');
  arrow(scaffold, 7905, 15588, 'left');
  strokeLine(scaffold, 5420, 13765, 6625, 14420);
  strokeLine(scaffold, 6570, 14388, 6708, 14308);
  arrow(scaffold, 6625, 14420, 'right', 60);
  strokeLine(scaffold, 7464, 15208, 8410, 15208);
  strokeLine(scaffold, 8355, 14578, 8355, 15121);

  const cleanup = add(drawing, names.group, { 'data-pipetools-outside-radius-cleanup': 'true' });
  strokeLine(cleanup, 8420, 14620, 9550, 14620, '#00ff00', 22);
  strokeLine(cleanup, 8420, 15180, 9550, 15180, '#00ff00', 22);
  textNode(cleanup, 8500, 15010, 'Outside Radius', 90, { 'data-pipetools-outside-radius-label': 'true' });

  const labels = add(drawing, names.group, { 'data-pipetools-pipe1-static-labels': 'true' });
  labelText(labels, 6660, 13255, 'OD');
  labelText(labels, 6560, 15772, 'ID');
  labelText(labels, 5030, 13610, 'Wall / Thk');
  labelText(labels, 7520, 16240, 'Weight / m', 110, { 'text-anchor': 'start' });

  const slots = add(drawing, names.group, { 'data-pipetools-pipe1-native-slots': 'true' });
  slotText(slots, 7300, 13255, '-', 110, 'OD');
  slotText(slots, 7300, 15772, '-', 110, 'ID');
  slotText(slots, 5900, 13610, '-', 110, 'Wall / Thk');
  slotText(slots, 8360, 16240, '-', 110, 'Weight / m', { 'text-anchor': 'start' });

  return root;
}
