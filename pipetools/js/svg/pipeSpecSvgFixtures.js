const valveBase = { componentType: 'VALVE', nps: '2', dn: 50, classRating: '150', facing: 'RF', endType: 'FLANGED', faceToFaceRfMm: 178, heightMm: 330, handwheelDiaMm: 180, outerDiaMm: 152 };
const flangeBase = { componentType: 'FLANGE', nps: '2', dn: 50, classRating: '150', facing: 'RF', flangeOdMm: 152, flangeThicknessMm: 18, rfDiaMm: 92, rfHeightMm: 2, weightKg: 4.1 };
const fittingBase = { componentType: 'FITTING', nps: '4', dn: 100, schedule: '40', odMm: 114.3, ctrToEndMm: 152, branchCtrToEndMm: 102, devLenMm: 250, overCapMm: 90, weightKg: 8.2 };
const gasketBase = { componentType: 'GASKET', nps: '2', dn: 50, classRating: '150', facing: 'RF', outerDiaMm: 120, innerDiaMm: 62, thicknessMm: 3 };
const reducerBase = { componentType: 'REDUCER', largeNps: '4', smallNps: '2', dn: 100, schedule: '40', largeOdMm: 114.3, smallOdMm: 60.3, centerToEndMm: 102, weightKg: 3.2 };
const oletBase = { componentType: 'OLET', runNps: '6', branchNps: '2', schedule: '40', branchSchedule: '80', runOdMm: 168.3, branchOdMm: 60.3, branchLengthMm: 78, weightKg: 1.8 };

function fixture(id, family, subtype, row, checks, priority = 2, status = 'COMPONENT_TEMPLATE') {
  return { id, family, subtype, priority, row: { id, ...row }, expected: { status, renderable: status !== 'MISSING_TEMPLATE', type: subtype }, checks };
}

export const PIPE_SPEC_SVG_FIXTURES = Object.freeze([
  fixture('pipe-sch40', 'PIPE', 'PIPE', { componentType: 'PIPE', nps: '4', dn: 100, schedule: '40', odMm: 114.3, wallMm: 6.02, weightKgPerM: 16.1, standard: 'ASME B36.10' }, ['wall lines visible', 'OD/wall labels readable', 'pipe is not confused with gasket'], 3),
  fixture('valve-gate-fl-rf', 'VALVE', 'GATE', { ...valveBase, valveType: 'GATE' }, ['wedge/gate body visible', 'stem and handwheel visible', 'F-F label visible'], 3),
  fixture('valve-globe-fl-rf', 'VALVE', 'GLOBE', { ...valveBase, valveType: 'GLOBE' }, ['round globe body', 'curved internal flow path', 'not gate-valve geometry'], 2),
  fixture('valve-ball-fl-rf', 'VALVE', 'BALL', { ...valveBase, valveType: 'BALL' }, ['circular ball body', 'lever handle visible', 'bore/ball cue visible'], 2),
  fixture('valve-swing-check-fl-rf', 'VALVE', 'SWING_CHECK', { ...valveBase, valveType: 'SWING_CHECK', source: 'data/normalized/valves-swingcheck-expanded.json' }, ['swing disc and hinge visible', 'flow arrow visible', 'not gate-valve fallback'], 1),
  fixture('valve-wafer-check', 'VALVE', 'WAFER_CHECK', { ...valveBase, valveType: 'WAFER_CHECK', endType: 'WAFER', facing: 'NA', source: 'data/normalized/valves-wafer-expanded.json' }, ['thin wafer body', 'disc/check plate visible', 'short F-F dimension'], 1),
  fixture('valve-butterfly-wafer', 'VALVE', 'BUTTERFLY', { ...valveBase, valveType: 'BUTTERFLY_WAFER', endType: 'WAFER', facing: 'NA', source: 'data/normalized/valves-wafer-expanded.json' }, ['thin valve body', 'diagonal butterfly disc', 'lever visible'], 1),
  fixture('valve-control-fl-rf', 'VALVE', 'CONTROL', { ...valveBase, valveType: 'CONTROL' }, ['actuator drawn above body', 'control body distinct from gate/globe', 'F-F label visible'], 1),
  fixture('flange-wn-rf', 'FLANGE', 'WN', { ...flangeBase, subtype: 'WN', weldDiaMm: 60.3, wnLengthMm: 70 }, ['weld neck taper visible', 'raised face visible', 'bolt cue visible'], 1),
  fixture('flange-so-rf', 'FLANGE', 'SO', { ...flangeBase, subtype: 'SO', soBoreMm: 62 }, ['slip-on bore visible', 'no weld-neck taper', 'raised face visible'], 1),
  fixture('flange-blind-rf', 'FLANGE', 'BLIND', { ...flangeBase, subtype: 'BLIND', blindThickMm: 20 }, ['solid blind plate', 'no pipe bore through centre', 'raised face visible'], 1),
  fixture('fitting-elbow-90', 'FITTING', 'ELBOW_90', { ...fittingBase, subtype: 'ELBOW_90' }, ['90 degree elbow arc', 'two orthogonal centre lines', 'C-E label visible'], 2),
  fixture('fitting-elbow-45', 'FITTING', 'ELBOW_45', { ...fittingBase, subtype: 'ELBOW_45' }, ['45 degree elbow arc', 'angled outlet', 'not shown as 90 elbow'], 2),
  fixture('fitting-tee-straight', 'FITTING', 'TEE_STRAIGHT', { ...fittingBase, subtype: 'TEE_STRAIGHT' }, ['equal branch width', 'straight run visible', 'branch C-E label visible'], 2),
  fixture('fitting-tee-reducing', 'FITTING', 'TEE_REDUCING', { ...fittingBase, subtype: 'TEE_REDUCING', branchOdMm: 60.3 }, ['reduced branch cue', 'straight run preserved', 'not equal tee fallback'], 1),
  fixture('fitting-cross', 'FITTING', 'CROSS', { ...fittingBase, subtype: 'CROSS' }, ['four-way cross shape', 'vertical and horizontal centrelines', 'not tee fallback'], 2),
  fixture('fitting-cap', 'FITTING', 'CAP', { ...fittingBase, subtype: 'CAP' }, ['closed domed end', 'single open end', 'overall length label visible'], 2),
  fixture('reducer-concentric', 'REDUCER', 'CONCENTRIC', { ...reducerBase, reducerType: 'CONCENTRIC' }, ['large and small ends aligned', 'conical transition', 'length label visible'], 1),
  fixture('reducer-eccentric', 'REDUCER', 'ECCENTRIC', { ...reducerBase, reducerType: 'ECCENTRIC' }, ['offset small end', 'eccentric flat-side cue', 'length label visible'], 1),
  fixture('gasket-flat-ring', 'GASKET', 'FLAT_RING', { ...gasketBase, subtype: 'FLAT_RING' }, ['ring with ID/OD', 'no full-face bolt cue', 'thickness label visible'], 3),
  fixture('gasket-full-face', 'GASKET', 'FULL_FACE', { ...gasketBase, subtype: 'FULL_FACE' }, ['full-face outer cue', 'ID/OD labels visible', 'distinct from flat ring'], 2),
  fixture('gasket-rtj', 'GASKET', 'RTJ', { ...gasketBase, subtype: 'RTJ' }, ['RTJ ring distinct from RF flat gasket', 'ID/OD labels visible', 'thickness label visible'], 1),
  fixture('gasket-spiral-wound', 'GASKET', 'SPIRAL_WOUND', { ...gasketBase, subtype: 'SPIRAL_WOUND' }, ['spiral/wound cue visible', 'ID/OD labels visible', 'not plain flat ring'], 1),
  fixture('olet-weldolet', 'OLET', 'WELDOLET', { ...oletBase, oletType: 'WELDOLET' }, ['branch boss on run pipe', 'W mark visible', 'run/branch label visible'], 1, 'APPROX_TEMPLATE'),
  fixture('olet-sockolet', 'OLET', 'SOCKOLET', { ...oletBase, oletType: 'SOCKOLET' }, ['socket boss distinct from weldolet', 'M mark visible', 'branch label visible'], 1, 'APPROX_TEMPLATE'),
  fixture('olet-thredolet', 'OLET', 'THREDOLET', { ...oletBase, oletType: 'THREDOLET' }, ['threaded boss cue', 'T mark visible', 'branch label visible'], 1, 'APPROX_TEMPLATE'),
  fixture('olet-elbolet', 'OLET', 'ELBOLET', { ...oletBase, oletType: 'ELBOLET' }, ['elbow-mounted branch cue', 'E mark visible', 'not straight weldolet fallback'], 1, 'APPROX_TEMPLATE'),
  fixture('support-shoe-pending', 'SUPPORT', 'SHOE', { componentType: 'SUPPORT', supportKind: 'SHOE', standard: 'manual review' }, ['blocked until support taxonomy exists', 'must show missing-template state'], 3, 'MISSING_TEMPLATE'),
  fixture('valve-needle-pending', 'VALVE', 'NEEDLE', { ...valveBase, valveType: 'NEEDLE' }, ['blocked; no generic valve fallback', 'must show missing-template state'], 3, 'MISSING_TEMPLATE'),
]);

export function getPipeSpecSvgFixtures() {
  return PIPE_SPEC_SVG_FIXTURES.map((item) => ({ ...item, checks: [...item.checks], row: { ...item.row } }));
}
