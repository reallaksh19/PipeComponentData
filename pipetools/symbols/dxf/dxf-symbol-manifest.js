(() => {
  const rows = `
PIPE_SCHEDULE|Pipe1|pipe1.dxf|symbols/Pipe1.svg|Pipe by Schedule|PIPE|PIPE|PIPE|||ASME B36.10M / B36.19M|componentType=PIPE
GASKET_FLAT_RING|Gflt1|gflt1.dxf|symbols/Gflt1.svg|Non-Metallic Flat Ring Gasket|GASKET|GASKET|FLAT_RING||RF/FF|ASME B16.21|componentType=GASKET;subtype=FLAT_RING
GASKET_SPIRAL_WOUND|Gspr1|gspr1.dxf|symbols/Gspr1.svg|Spiral Wound Gasket|GASKET|GASKET|SPIRAL_WOUND||RF|ASME B16.20|componentType=GASKET;subtype=SPIRAL_WOUND
GASKET_RTJ_RING|Grtj1|grtj1.dxf|symbols/Grtj1.svg|RTJ Ring Gasket|GASKET|GASKET|RTJ||RTJ|ASME B16.20|componentType=GASKET;subtype=RTJ
FLANGE_WELD_NECK|Flan1|flan1.dxf|symbols/Flan1.svg|Weld Neck Flange|FLANGE|FLANGE|WN|FLANGED||ASME B16.5|componentType=FLANGE;subtype=WN
FLANGE_SLIP_ON|Flan2|flan2.dxf|symbols/flan2.svg|Slip-On Flange|FLANGE|FLANGE|SO|FLANGED||ASME B16.5|componentType=FLANGE;subtype=SO
FLANGE_BLIND|Flan3|flan3.dxf|symbols/flan3.svg|Blind Flange|FLANGE|FLANGE|BLIND|FLANGED||ASME B16.5|componentType=FLANGE;subtype=BLIND
FLANGE_WELD_NECK_SERIES_B|FLAP1|flap1.dxf|symbols/FLAP1.svg|Series B Weld Neck Flange|FLANGE|FLANGE|WN_SERIES_B|FLANGED||ASME B16.47 Series B|componentType=FLANGE;subtype=WN
VALVE_GATE_FLANGED|Vlfl1|vlfl1.dxf|symbols/vlfl1.svg|Flanged Gate Valve|VALVE|VALVE|GATE|FLANGED||ASME B16.10|componentType=VALVE;valveType=GATE;endType=FLANGED
VALVE_GLOBE_FLANGED|Vlfl2|vlfl2.dxf|symbols/vlfl2.svg|Flanged Globe Valve|VALVE|VALVE|GLOBE|FLANGED||ASME B16.10|componentType=VALVE;valveType=GLOBE;endType=FLANGED
VALVE_BALL_FLANGED|Vlfl3|vlfl3.dxf|symbols/vlfl3.svg|Flanged Ball Valve|VALVE|VALVE|BALL|FLANGED||ASME B16.10|componentType=VALVE;valveType=BALL;endType=FLANGED
VALVE_CONTROL_FLANGED|Vlfl4|vlfl4.dxf|symbols/vlfl4.svg|Flanged Control Valve|VALVE|VALVE|CONTROL|FLANGED||ASME B16.10|componentType=VALVE;valveType=CONTROL;endType=FLANGED
VALVE_SWING_CHECK_FLANGED|Vlfl5|vlfl5.dxf|symbols/vlfl5.svg|Flanged Swing Check Valve|VALVE|VALVE|SWING_CHECK|FLANGED||ASME B16.10|componentType=VALVE;valveType=SWING_CHECK;endType=FLANGED
VALVE_WAFER_CHECK_FLANGED|Vlfl6|vlfl6.dxf|symbols/VLFL6.svg|Flanged Wafer Check Valve|VALVE|VALVE|WAFER_CHECK|FLANGED||ASME B16.10|componentType=VALVE;valveType=WAFER_CHECK;endType=FLANGED
VALVE_BUTTERFLY_WAFER|Vlfl7|vlfl7.dxf|symbols/vlfl7.svg|Wafer Butterfly Valve|VALVE|VALVE|BUTTERFLY|WAFER||ASME B16.10|componentType=VALVE;valveType=BUTTERFLY;endType=WAFER
FITTING_ELBOW_45_BW|Ftbw1|ftbw1.dxf|symbols/ftbw1.svg|BW 45° Elbow|FITTING|FITTING|ELBOW_45|BW||ASME B16.9|componentType=FITTING;subtype=ELBOW_45
FITTING_ELBOW_90_LR_BW|Ftbw2|ftbw2.dxf|symbols/ftbw2.svg|BW 90° Long Radius Elbow|FITTING|FITTING|ELBOW_90|BW||ASME B16.9|componentType=FITTING;subtype=ELBOW_90
FITTING_TEE_EQUAL_BW|Ftbw6|ftbw6.dxf|symbols/ftbw6.svg|BW Equal Tee|FITTING|FITTING|TEE_EQUAL|BW||ASME B16.9|componentType=FITTING;subtype=TEE_STRAIGHT
FITTING_TEE_REDUCING_BW|Ftbw7|ftbw7.dxf|symbols/ftbw7.svg|BW Reducing Tee|FITTING|FITTING|TEE_REDUCING|BW||ASME B16.9|componentType=FITTING;subtype=TEE_REDUCING
FITTING_CAP_BW|Ftbw8|ftbw8.dxf|symbols/ftbw8.svg|BW Cap|FITTING|FITTING|CAP|BW||ASME B16.9|componentType=FITTING;subtype=CAP
REDUCER_CONCENTRIC_BW|Ftbw9|ftbw9.dxf|symbols/ftbw9.svg|BW Concentric Reducer|REDUCER|REDUCER|CONCENTRIC|BW||ASME B16.9|componentType=REDUCER;reducerType=CONCENTRIC
REDUCER_ECCENTRIC_BW|Ftbw10|ftbw10.dxf|symbols/ftbw10.svg|BW Eccentric Reducer|REDUCER|REDUCER|ECCENTRIC|BW||ASME B16.9|componentType=REDUCER;reducerType=ECCENTRIC
OLET_WELDOLET|Wbol1|wbol1.dxf|symbols/wbol1.svg|Weldolet|OLET|OLET|WELDOLET|BW||MSS SP-97|componentType=OLET;oletType=WELDOLET
OLET_ELBOLET|Wbol2|wbol2.dxf|symbols/wbol2.svg|Elbolet|OLET|OLET|ELBOLET|BW||MSS SP-97|componentType=OLET;oletType=ELBOLET
OLET_THREDOLET|Wbol4|wbol4.dxf|symbols/wbol4.svg|Threadolet|OLET|OLET|THREDOLET|THREADED||MSS SP-97 / ASME B16.11|componentType=OLET;oletType=THREDOLET
OLET_SOCKOLET|Wbol7|wbol7.dxf|symbols/wbol7.svg|Sockolet|OLET|OLET|SOCKOLET|SOCKET_WELD||MSS SP-97 / ASME B16.11|componentType=OLET;oletType=SOCKOLET
FITTING_CROSS_THREADED|Ftsc3|ftsc3.dxf|symbols/Ftsc3.svg|Threaded Cross|FITTING|FITTING|CROSS|THREADED||ASME B16.11|componentType=FITTING;subtype=CROSS
LINE_BLANK_FIGURE_8|Blnu1|blnu1.dxf|symbols/Blnu1.svg|Figure-8 Blank / Spectacle Blind|LINE_BLANK|LINE_BLANK|FIGURE_8_BLANK|FLANGED||ASME B16.48|componentType=LINE_BLANK;subtype=FIGURE_8_BLANK
`.trim().split('\n');
  const parseLookup = text => Object.fromEntries(text.split(';').filter(Boolean).map(pair => pair.split('=')));
  const symbols = rows.map(line => {
    const [id, sourceCode, sourceDxf, svg, title, family, componentType, subtype, endType, facing, standard, lookup] = line.split('|');
    return { id, sourceCode, sourceDxf, svg, title, family, componentType, subtype, endType: endType || null, facing: facing || null, standard, quality: 'DXF_DERIVED', dbLookup: parseLookup(lookup), notes: ['Fallback manifest entry for static file:// use.'] };
  });
  window.DXF_SYMBOL_MANIFEST = {
    schema: 'pipecomponentdata-dxf-symbol-manifest/v1',
    version: '2026-06-20',
    source: { kind: 'DXF_CONVERTED_SVG', sourcePackages: ['DXF.zip', 'converted_svg.zip'], policy: 'Use symbols/*.svg only; unsupported rows return SVG_NOT_AVAILABLE.' },
    dbIndexCandidates: ['../../data/db-index.json', '../data/db-index.json', './data/db-index.json', './pipetools/data/db-index.json', '/pipetools/data/db-index.json'],
    symbols
  };
})();
