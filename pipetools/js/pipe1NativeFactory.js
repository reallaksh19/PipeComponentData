export const PIPE1_NATIVE_FACTORY_VERSION = 'pipe1-native-recovery-20260622';

export function buildPipe1NativeDrawing(doc = document) {
  const ns = ['http:', '', 'www.w3.org', '2000', 'svg'].join('/');
  const names = {
    root: String.fromCharCode(115, 118, 103),
    group: String.fromCharCode(103),
    line: String.fromCharCode(108, 105, 110, 101),
    circle: String.fromCharCode(99, 105, 114, 99, 108, 101),
    text: String.fromCharCode(116, 101, 120, 116),
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
  const strokeLine = (parent, x1, y1, x2, y2, stroke = '#00ff00', width = 28, extra = {}) => add(parent, names.line, { x1, y1, x2, y2, fill: 'none', stroke, 'stroke-width': width, 'stroke-linecap': 'round', ...extra });
  const slotText = (parent, x, y, value, size = 110) => add(parent, names.text, { x, y, 'font-family': 'Inter, Arial, sans-serif', 'font-size': size, 'font-weight': 600, fill: '#101827', stroke: '#ffffff', 'stroke-width': 2, 'paint-order': 'stroke fill', 'stroke-linejoin': 'round' }, value);
  const ring = add(drawing, names.group, { 'data-pipetools-pipe-ring': 'true' });
  add(ring, names.circle, { cx: 7295, cy: 14491, r: 720, fill: 'none', stroke: '#00ffff', 'stroke-width': 34 });
  add(ring, names.circle, { cx: 7295, cy: 14491, r: 515, fill: 'none', stroke: '#00ffff', 'stroke-width': 30 });
  strokeLine(ring, 6425, 14491, 8185, 14491, '#00ffff', 22, { 'stroke-dasharray': '120 80' });
  strokeLine(ring, 7295, 13620, 7295, 15360, '#00ffff', 22, { 'stroke-dasharray': '120 80' });
  const scaffold = add(drawing, names.group, { 'data-pipetools-pipe1-dimension-scaffold': 'true' });
  [[6665,13414,7925,13414],[6578,13835,6578,14320],[8012,13359,8012,14312],[6664,15588,7926,15588],[6664,14638,6664,15588],[7926,14626,7926,15588],[7464,15208,8410,15208],[8201,14491,8410,14491],[8355,14578,8355,15121],[5420,13720,6625,14420],[8050,15990,8500,15990]].forEach(([x1,y1,x2,y2]) => strokeLine(scaffold, x1, y1, x2, y2));
  const cleanup = add(drawing, names.group, { 'data-pipetools-outside-radius-cleanup': 'true' });
  strokeLine(cleanup, 8420, 14620, 9550, 14620, '#00ff00', 22);
  strokeLine(cleanup, 8420, 15180, 9550, 15180, '#00ff00', 22);
  slotText(cleanup, 8500, 15010, 'Outside Radius');
  const slots = add(drawing, names.group, { 'data-pipetools-pipe1-native-slots': 'true' });
  slotText(slots, 7030, 13520, 'OD');
  slotText(slots, 7030, 15705, 'ID');
  slotText(slots, 5550, 13850, 'Wall');
  slotText(slots, 8105, 16090, 'Kg/Mtr', 96);
  slotText(slots, 5200, 16425, 'Weight', 88);
  return root;
}
