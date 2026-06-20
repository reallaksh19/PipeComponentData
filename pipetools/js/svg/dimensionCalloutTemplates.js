const BASE_SLOTS = {
  lengthBottom: { kind: 'dimension-x', x1: 180, y1: 855, x2: 820, y2: 855, lx: 500, ly: 812, anchor: 'middle' },
  lengthMid: { kind: 'dimension-x', x1: 245, y1: 725, x2: 755, y2: 725, lx: 500, ly: 682, anchor: 'middle' },
  heightRight: { kind: 'dimension-y', x1: 862, y1: 220, x2: 862, y2: 760, lx: 822, ly: 214, anchor: 'start' },
  diameterTop: { kind: 'diameter', x1: 315, y1: 142, x2: 685, y2: 142, lx: 500, ly: 100, anchor: 'middle' },
  diameterLeft: { kind: 'diameter', x1: 142, y1: 280, x2: 142, y2: 720, lx: 178, ly: 254, anchor: 'start' },
  thicknessMid: { kind: 'leader', x1: 670, y1: 640, x2: 520, y2: 610, lx: 642, ly: 600, anchor: 'start' },
  branchHeight: { kind: 'dimension-y', x1: 500, y1: 170, x2: 500, y2: 525, lx: 526, ly: 158, anchor: 'start' },
  runLength: { kind: 'dimension-x', x1: 185, y1: 820, x2: 815, y2: 820, lx: 500, ly: 778, anchor: 'middle' },
  smallEnd: { kind: 'diameter', x1: 610, y1: 235, x2: 610, y2: 705, lx: 642, ly: 226, anchor: 'start' },
  largeEnd: { kind: 'diameter', x1: 196, y1: 225, x2: 196, y2: 735, lx: 232, ly: 218, anchor: 'start' },
  badge1: { kind: 'badge', lx: 735, ly: 106, anchor: 'start' },
  badge2: { kind: 'badge', lx: 735, ly: 154, anchor: 'start' },
  badge3: { kind: 'badge', lx: 735, ly: 202, anchor: 'start' },
  badge4: { kind: 'badge', lx: 735, ly: 250, anchor: 'start' },
};

const TEMPLATE_FIELDS = {
  VALVE: [
    ['lengthBottom', ['F2F RF', 'F2F RTJ', 'BW length', 'C-E']],
    ['heightRight', ['Height']],
    ['diameterTop', ['HW dia']],
    ['badge1', ['Weight', 'RF/RTJ weight', 'BW weight'], false],
  ],
  FLANGE: [
    ['diameterLeft', ['OD']],
    ['thicknessMid', ['Wall / Thk', 'RF height']],
    ['diameterTop', ['RF dia', 'PCD']],
    ['badge1', ['Bolt count'], false],
    ['badge2', ['Bolt size'], false],
    ['badge3', ['Weight', 'RF/RTJ weight'], false],
  ],
  GASKET: [
    ['diameterLeft', ['OD']],
    ['diameterTop', ['ID']],
    ['thicknessMid', ['Wall / Thk']],
  ],
  FITTING: [
    ['lengthBottom', ['C-E', 'Dev. len', 'Over cap']],
    ['branchHeight', ['OD']],
    ['thicknessMid', ['Wall / Thk']],
    ['badge1', ['Weight', 'BW weight'], false],
  ],
  REDUCER: [
    ['lengthBottom', ['C-E', 'BW length']],
    ['largeEnd', ['OD']],
    ['smallEnd', ['ID']],
    ['thicknessMid', ['Wall / Thk']],
    ['badge1', ['Weight', 'BW weight'], false],
  ],
  OLET: [
    ['runLength', ['OD']],
    ['branchHeight', ['C-E', 'Dev. len']],
    ['diameterTop', ['ID']],
    ['thicknessMid', ['Wall / Thk']],
    ['badge1', ['Weight', 'BW weight'], false],
  ],
  PIPE: [
    ['diameterLeft', ['OD']],
    ['thicknessMid', ['Wall / Thk']],
    ['badge1', ['Weight / m'], false],
  ],
  LINE_BLANK: [
    ['diameterLeft', ['OD']],
    ['diameterTop', ['ID']],
    ['thicknessMid', ['Wall / Thk']],
    ['badge1', ['Weight'], false],
  ],
};

const SOURCE_OVERRIDES = {
  Vlfl7: { fields: [
    ['lengthMid', ['F2F RF', 'F2F RTJ', 'BW length', 'C-E']],
    ['diameterTop', ['OD', 'HW dia']],
    ['thicknessMid', ['Wall / Thk']],
    ['badge1', ['Weight', 'RF/RTJ weight'], false],
  ] },
  Ftbw6: { fields: teeFields() },
  Ftbw7: { fields: teeFields() },
  Ftsc3: { fields: teeFields() },
};

function teeFields() {
  return [
    ['runLength', ['C-E', 'Dev. len']],
    ['branchHeight', ['OD']],
    ['thicknessMid', ['Wall / Thk']],
    ['badge1', ['Weight', 'BW weight'], false],
  ];
}

export function calloutTemplateFor(symbol = {}) {
  const source = String(symbol.sourceCode || '');
  const family = String(symbol.family || '').toUpperCase();
  const override = SOURCE_OVERRIDES[source];
  return {
    slots: BASE_SLOTS,
    fields: override?.fields || TEMPLATE_FIELDS[family] || TEMPLATE_FIELDS.FITTING,
  };
}
