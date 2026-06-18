export const MODULES = [
  'PipeSpec DB', 'Pipe Span', '2D Bundle Calc', 'Pipe Spacing',
  'Section Designer', 'Reports', 'Settings'
];

export const COMPONENTS = [
  { key: 'PIPE', label: 'Pipe', count: 0 },
  { key: 'VALVE', label: 'Valve', count: 0 },
  { key: 'FLANGE', label: 'Flange', count: 0 },
  { key: 'FITTING', label: 'Fitting', count: 0 },
  { key: 'GASKET', label: 'Gasket', count: 0 },
  { key: 'SUPPORT', label: 'Support', count: 0 },
];

export const VALVE_TYPES = ['GATE', 'GLOBE', 'CHECK', 'BALL', 'BUTTERFLY', 'PLUG'];
export const END_TYPES = ['FLANGED', 'BUTT-WELD', 'SOCKET-WELD', 'THREADED'];
export const FACINGS = ['RF', 'RTJ', 'FF'];
export const CLASSES = ['150', '300', '600', '900', '1500'];

export const PIPE_SPAN_CONSTANTS = {
  insulationDensityKgM3: 150,
  waterDensityKgM3: 1000,
  steelDensityGcm3: 7.85,
  youngsModulusNmm2: 210000,
  allowableDeflectionMm: 10,
  allowableStressNmm2: 40,
  allowableIndentationStressNmm2: 67,
  bearingLengthMm: 100,
  bearingBaseMmFor42In: 16.5,
  bearingBaseOdMm: 1067,
};

export const PIPE_SPAN_ROWS = [
  { nps: 6, odMm: 168.27, schedule: 'Sch 40', thicknessMm: 7.11, insulationMm: 100 },
  { nps: 8, odMm: 219.07, schedule: 'Sch 40', thicknessMm: 8.18, insulationMm: 120 },
  { nps: 10, odMm: 273.05, schedule: 'Sch 40', thicknessMm: 9.27, insulationMm: 120 },
  { nps: 12, odMm: 323.85, schedule: 'STD', thicknessMm: 9.53, insulationMm: 120 },
  { nps: 24, odMm: 609.6, schedule: 'STD', thicknessMm: 9.53, insulationMm: 140 },
];

export const QMS_CS_REFERENCE = [
  { nps: 6, vapourBareMm: 8900, vapourInsulatedMm: 7950, waterBareMm: 7850, waterInsulatedMm: 7000 },
  { nps: 8, vapourBareMm: 10250, vapourInsulatedMm: 9100, waterBareMm: 8600, waterInsulatedMm: 8000 },
  { nps: 10, vapourBareMm: 11400, vapourInsulatedMm: 10300, waterBareMm: 9350, waterInsulatedMm: 8850 },
  { nps: 12, vapourBareMm: 12500, vapourInsulatedMm: 11300, waterBareMm: 9900, waterInsulatedMm: 9450 },
  { nps: 24, vapourBareMm: 17200, vapourInsulatedMm: 15900, waterBareMm: 13100, waterInsulatedMm: 12700 },
];

export const DEFAULT_SPAN_INPUT = {
  nps: 8,
  service: 'VAPOUR',
  insulation: 'BARE',
  material: 'CS',
};
