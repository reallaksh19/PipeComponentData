export const ALIASES = {
  component: {
    VALVE: ['VALVE', 'VALVES', 'VLV', 'VL'],
    PIPE: ['PIPE', 'PIPES'],
    FLANGE: ['FLANGE', 'FLANGES', 'FLG', 'FL'],
    FITTING: ['FITTING', 'FITTINGS', 'FIT'],
    GASKET: ['GASKET', 'GASKETS'],
    SUPPORT: ['SUPPORT', 'SUPPORTS'],
  },
  valveType: {
    GATE: ['GATE', 'GTV', 'GV'],
    GLOBE: ['GLOBE', 'GLV'],
    CHECK: ['CHECK', 'NRV', 'NON RETURN', 'NONRETURN'],
    BALL: ['BALL', 'BV'],
    BUTTERFLY: ['BUTTERFLY', 'BFV'],
    PLUG: ['PLUG'],
  },
  flangeType: {
    WN: ['WN', 'WELD NECK', 'WELDNECK'],
    SO: ['SO', 'SLIP ON', 'SLIPON'],
    BLIND: ['BLIND', 'BL'],
    LJ: ['LJ', 'LAP JOINT'],
  },
  fittingType: {
    ELBOW_90_LR: ['ELBOW 90 LR', '90 LR', '90ELBOW', '90 ELBOW', 'EL90LR'],
    ELBOW_90: ['ELBOW 90', '90E', '90 ELBOW'],
    ELBOW_45: ['ELBOW 45', '45E', '45 ELBOW'],
    TEE: ['TEE', 'EQUAL TEE'],
    REDUCER: ['REDUCER', 'RED'],
    CAP: ['CAP'],
  },
  endType: {
    FLANGED: ['FLANGED', 'FLANGE', 'FLG', 'FL'],
    'BUTT-WELD': ['BUTT WELD', 'BUTTWELD', 'BW', 'B W', 'B/W'],
    'SOCKET-WELD': ['SOCKET WELD', 'SOCKETWELD', 'SW', 'S W', 'S/W'],
    THREADED: ['THREADED', 'THREAD', 'THD', 'NPT', 'SCRD'],
  },
  facing: {
    RF: ['RF', 'RAISED FACE'],
    RTJ: ['RTJ', 'RING TYPE JOINT', 'RING JOINT'],
    FF: ['FF', 'FLAT FACE'],
  },
  classRating: {
    150: ['150', '150#', 'CL150', 'CL 150', 'CLASS150', 'CLASS 150', '150LB'],
    300: ['300', '300#', 'CL300', 'CL 300', 'CLASS300', 'CLASS 300', '300LB'],
    600: ['600', '600#', 'CL600', 'CL 600', 'CLASS600', 'CLASS 600', '600LB'],
    900: ['900', '900#', 'CL900', 'CL 900', 'CLASS900', 'CLASS 900', '900LB'],
    1500: ['1500', '1500#', 'CL1500', 'CL 1500', 'CLASS1500', 'CLASS 1500', '1500LB'],
    2500: ['2500', '2500#', 'CL2500', 'CL 2500', 'CLASS2500', '2500LB'],
  },
  schedule: {
    SCH40: ['SCH40', 'SCH 40', 'SCHEDULE 40', 'STD'],
    SCH80: ['SCH80', 'SCH 80', 'SCHEDULE 80', 'XS'],
    SCH160: ['SCH160', 'SCH 160', 'SCHEDULE 160'],
    XXS: ['XXS', 'DOUBLE EXTRA STRONG'],
  },
};

export function findCanonical(groupName, query) {
  const group = ALIASES[groupName] ?? {};
  const padded = ` ${query} `;
  return Object.entries(group).find(([, aliases]) =>
    aliases.some((alias) => padded.includes(` ${alias} `))
  )?.[0];
}
