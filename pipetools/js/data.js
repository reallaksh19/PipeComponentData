export const MODULES = [
  'PipeSpec DB', 'Pipe Span', '2D Bundle Calc', 'Pipe Spacing',
  'Section Designer', 'Reports', 'Settings'
];

export const DISABLED_MODULES = ['Pipe Spacing', 'Section Designer', 'Reports'];

export const COMPONENTS = [
  { key: 'PIPE', label: 'Pipe', count: 0 },
  { key: 'VALVE', label: 'Valve', count: 0 },
  { key: 'FLANGE', label: 'Flange', count: 0 },
  { key: 'FITTING', label: 'Fitting', count: 0 },
  { key: 'GASKET', label: 'Gasket', count: 0 },
  { key: 'SUPPORT', label: 'Support', count: 0 },
  { key: 'REDUCER', label: 'Reducer', count: 0 },
  { key: 'OLET', label: 'Olet', count: 0 },
];

export const VALVE_TYPES = ['GATE', 'GLOBE', 'CHECK', 'BALL', 'BUTTERFLY', 'PLUG'];
export const END_TYPES = ['FLANGED', 'BUTT-WELD', 'SOCKET-WELD', 'THREADED'];
export const FACINGS = ['RF', 'RTJ', 'FF'];
export const CLASSES = ['150', '300', '600', '900', '1500'];

export const DEFAULT_SPAN_INPUT = {
  nps: 8, schedule: 'Sch 40', service: 'VAPOUR', insulation: 'BARE', material: 'CS',
  beamMethod: 'CONTINUOUS', showDetailed: false,
  insulationDensityKgM3: 150,
  waterDensityKgM3: 1000,
  youngsModulusNmm2: 210000,
  allowableDeflectionMm: 10,
  allowableStressNmm2: 40,
  bearingLengthMm: 100,
  bearingBaseMmFor42In: 16.5,
  allowableIndentationStressNmm2: 67,
};
