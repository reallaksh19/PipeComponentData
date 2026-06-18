export const PIPE_SPAN_SOURCE = Object.freeze({
  workbook: 'Pipe Span Check-FINAL.xlsx',
  sheets: ['Input', 'Bare+Vapour', 'Insul+Vapour', 'Bare+Water', 'Insul+Water', 'QMS - CS', 'QMS - SS'],
});

export const PIPE_SPAN_CONSTANTS = Object.freeze({
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
});

const row = (nps, odMm, schedule, thicknessMm, insulationMm) => ({ nps, odMm, schedule, thicknessMm, insulationMm });

export const PIPE_SPAN_ROWS = Object.freeze([
  row(0.75, 26.67, 'Sch 40', 2.87, 40), row(1, 33.4, 'Sch 40', 3.38, 40),
  row(1.5, 48.26, 'Sch 40', 3.68, 50), row(2, 60.32, 'Sch 40', 3.91, 50),
  row(2.5, 73.02, 'Sch 40', 5.16, 50), row(3, 88.9, 'Sch 40', 5.49, 100),
  row(4, 114.3, 'Sch 40', 6.02, 100), row(6, 168.27, 'Sch 40', 7.11, 100),
  row(8, 219.07, 'Sch 40', 8.18, 120), row(10, 273.05, 'Sch 40', 9.27, 120),
  row(12, 323.85, 'STD', 9.53, 120), row(14, 355.6, 'STD', 9.53, 120),
  row(16, 406.4, 'STD', 9.53, 120), row(18, 457.2, 'STD', 9.53, 120),
  row(20, 508, 'STD', 9.53, 140), row(22, 558.8, 'STD', 9.53, 140),
  row(24, 609.6, 'STD', 9.53, 140), row(26, 660.4, 'STD', 9.53, 140),
  row(28, 711.2, 'STD', 9.53, 140), row(30, 762, 'STD', 9.53, 140),
  row(32, 812.8, 'STD', 9.53, 140), row(34, 863.6, 'STD', 9.53, 140),
  row(36, 914.4, 'STD', 9.53, 140), row(42, 1066.8, 'STD', 9.53, 140),
  row(48, 1219.2, 'STD', 9.53, 140), row(0.75, 26.67, 'Sch 80', 3.91, 40),
  row(1, 33.4, 'Sch 80', 4.55, 40), row(1.5, 48.26, 'Sch 80', 5.08, 50),
  row(2, 60.32, 'Sch 80', 5.54, 50), row(3, 88.9, 'Sch 80', 7.62, 100),
  row(4, 114.3, 'Sch 80', 8.56, 100), row(6, 168.27, 'Sch 80', 10.97, 100),
  row(8, 219.07, 'Sch 80', 12.7, 120), row(10, 273.05, 'Sch 80', 15.09, 120),
  row(12, 323.85, 'XS', 12.7, 120), row(2, 60.32, '10S', 2.77, 50),
  row(3, 88.9, '10S', 3.05, 100), row(4, 114.3, '10S', 3.05, 100),
  row(6, 168.27, '10S', 3.4, 100), row(8, 219.07, '10S', 3.76, 120),
  row(10, 273.05, '10S', 4.19, 120), row(12, 323.85, '10S', 4.57, 120),
  row(14, 355.6, '10S', 4.78, 120), row(16, 406.4, '10S', 4.78, 120),
  row(18, 457.2, '10S', 4.78, 120), row(20, 508, '10S', 5.54, 140),
  row(24, 609.6, '10S', 6.35, 140),
]);

const qms = (nps, values) => ({ nps, ...values });

export const QMS_REFERENCE = Object.freeze({
  CS: [
    qms(1, { vapourBareMm: 3800, vapourInsulatedMm: 3300, waterBareMm: 3650, waterInsulatedMm: 3200, rackVapourBareMm: 5700, rackVapourInsulatedMm: 5200, rackWaterBareMm: 5500, rackWaterInsulatedMm: 5000 }),
    qms(1.5, { vapourBareMm: 4650, vapourInsulatedMm: 3900, waterBareMm: 4350, waterInsulatedMm: 3750, rackVapourBareMm: 6900, rackVapourInsulatedMm: 6300, rackWaterBareMm: 6600, rackWaterInsulatedMm: 6100 }),
    qms(2, { vapourBareMm: 5250, vapourInsulatedMm: 4250, waterBareMm: 4850, waterInsulatedMm: 4000, rackVapourBareMm: 7900, rackVapourInsulatedMm: 7100, rackWaterBareMm: 7100, rackWaterInsulatedMm: 6600 }),
    qms(3, { vapourBareMm: 6400, vapourInsulatedMm: 4800, waterBareMm: 5850, waterInsulatedMm: 4400, rackVapourBareMm: 9500, rackVapourInsulatedMm: 8200, rackWaterBareMm: 8800, rackWaterInsulatedMm: 7400 }),
    qms(4, { vapourBareMm: 7300, vapourInsulatedMm: 6450, waterBareMm: 6600, waterInsulatedMm: 5950, rackVapourBareMm: null, rackVapourInsulatedMm: null, rackWaterBareMm: null, rackWaterInsulatedMm: 8500 }),
    qms(6, { vapourBareMm: 8900, vapourInsulatedMm: 7950, waterBareMm: 7850, waterInsulatedMm: 7000, rackVapourBareMm: null, rackVapourInsulatedMm: null, rackWaterBareMm: null, rackWaterInsulatedMm: null }),
    qms(8, { vapourBareMm: 10250, vapourInsulatedMm: 9100, waterBareMm: 8600, waterInsulatedMm: 8000, rackVapourBareMm: null, rackVapourInsulatedMm: null, rackWaterBareMm: null, rackWaterInsulatedMm: null }),
    qms(10, { vapourBareMm: 11400, vapourInsulatedMm: 10300, waterBareMm: 9350, waterInsulatedMm: 8850, rackVapourBareMm: null, rackVapourInsulatedMm: null, rackWaterBareMm: null, rackWaterInsulatedMm: null }),
    qms(12, { vapourBareMm: 12500, vapourInsulatedMm: 11300, waterBareMm: 9900, waterInsulatedMm: 9450, rackVapourBareMm: null, rackVapourInsulatedMm: null, rackWaterBareMm: null, rackWaterInsulatedMm: null }),
  ],
  SS: [
    qms(1, { vapourBareMm: 3800, vapourInsulatedMm: 3300, waterBareMm: 3650, waterInsulatedMm: 3200, rackVapourBareMm: 5700, rackVapourInsulatedMm: 4300, rackWaterBareMm: 5200, rackWaterInsulatedMm: 4100 }),
    qms(1.5, { vapourBareMm: 4700, vapourInsulatedMm: 3900, waterBareMm: 4350, waterInsulatedMm: 3700, rackVapourBareMm: 7000, rackVapourInsulatedMm: 4800, rackWaterBareMm: 5900, rackWaterInsulatedMm: 4600 }),
    qms(2, { vapourBareMm: 5300, vapourInsulatedMm: 4000, waterBareMm: 4700, waterInsulatedMm: 3850, rackVapourBareMm: 7900, rackVapourInsulatedMm: 5400, rackWaterBareMm: 6900, rackWaterInsulatedMm: 4900 }),
    qms(3, { vapourBareMm: 6500, vapourInsulatedMm: 4300, waterBareMm: 5550, waterInsulatedMm: 4000, rackVapourBareMm: null, rackVapourInsulatedMm: 7000, rackWaterBareMm: 8200, rackWaterInsulatedMm: 6200 }),
    qms(4, { vapourBareMm: 7400, vapourInsulatedMm: 6000, waterBareMm: 6150, waterInsulatedMm: 5100, rackVapourBareMm: null, rackVapourInsulatedMm: null, rackWaterBareMm: null, rackWaterInsulatedMm: 7000 }),
    qms(6, { vapourBareMm: 9000, vapourInsulatedMm: 7000, waterBareMm: 7150, waterInsulatedMm: 5800, rackVapourBareMm: null, rackVapourInsulatedMm: null, rackWaterBareMm: null, rackWaterInsulatedMm: 9500 }),
    qms(8, { vapourBareMm: 10300, vapourInsulatedMm: 8700, waterBareMm: 8000, waterInsulatedMm: 6700, rackVapourBareMm: null, rackVapourInsulatedMm: null, rackWaterBareMm: null, rackWaterInsulatedMm: null }),
  ],
});

export const DEFAULT_PIPE_SPAN_INPUT = Object.freeze({
  nps: 8,
  schedule: 'Sch 40',
  service: 'VAPOUR',
  insulation: 'BARE',
  material: 'CS',
  beamMethod: 'CONTINUOUS',
});

export const PIPE_SPAN_VALIDATION_CASES = Object.freeze([
  { name: 'Sample Cal-Bare+Vapour', input: { nps: 2, schedule: 'Sch 40', service: 'VAPOUR', insulation: 'BARE', material: 'CS' }, expected: { totalWeightNPerM: 53.3623, continuousStressM: 9.0870, continuousDeflectionM: 8.0419, selectedMethodSpanM: 8.0419, leastAllowableSpanM: 5.379, governingSpanM: 8.0419, qmsReferenceM: 7.9 } },
  { name: 'Sample Cal-Insul+Vapour', input: { nps: 2, schedule: 'Sch 40', service: 'VAPOUR', insulation: 'INSULATED', material: 'CS' }, expected: { totalWeightNPerM: 78.8671, continuousStressM: 7.4746, continuousDeflectionM: 7.2936, selectedMethodSpanM: 7.2936, leastAllowableSpanM: 4.878, governingSpanM: 7.2936, qmsReferenceM: 7.1 } },
  { name: 'Sample Cal-Bare+Water', input: { nps: 2, schedule: 'Sch 40', service: 'WATER', insulation: 'BARE', material: 'CS' }, expected: { totalWeightNPerM: 74.5905, continuousStressM: 7.6859, continuousDeflectionM: 7.3960, selectedMethodSpanM: 7.3960, leastAllowableSpanM: 4.947, governingSpanM: 7.3960, qmsReferenceM: 7.1 } },
  { name: 'Sample Cal-Insul+Water', input: { nps: 2, schedule: 'Sch 40', service: 'WATER', insulation: 'INSULATED', material: 'CS' }, expected: { totalWeightNPerM: 100.0953, continuousStressM: 6.6348, continuousDeflectionM: 6.8717, selectedMethodSpanM: 6.6348, leastAllowableSpanM: 4.596, governingSpanM: 6.6348, qmsReferenceM: 6.6 } },
]);
