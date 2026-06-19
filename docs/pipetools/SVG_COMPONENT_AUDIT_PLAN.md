# PipeTools DB2 SVG Component Audit Plan

## Purpose

The DB2 database is now the reference data line for PipeTools SVG work. The SVG renderer must not show a misleading generic shape as if it were component-correct. Each component family is classified as one of:

- `COMPONENT_TEMPLATE`: explicit component symbol is available and renderable.
- `APPROX_TEMPLATE`: first-pass engineering symbol is available, but geometry still needs visual comparison/tuning.
- `MISSING_TEMPLATE`: do not render; show explicit missing-template reason.

## DB2 source families audited

The DB2 export manifest includes normalized artifacts for pipes, flanges, valves, fittings, gaskets, supports, reducers, and olets. It also includes the latest valve/olet/reducer expansions such as `valves-swingcheck-expanded.json`, `valves-wafer-expanded.json`, `reducers.json`, and the four olet catalogs.

## Current SVG audit matrix

| Family | DB2 artifacts / subtypes | Current SVG status | Immediate coding action |
| --- | --- | --- | --- |
| PIPE | pipe schedules, expanded pipe schedules | `COMPONENT_TEMPLATE` | Keep pipe symbol; later tune scale against OD/wall labels. |
| FLANGE | WN, SO, BLIND in active renderer scope | `COMPONENT_TEMPLATE` for WN/SO/BLIND | Differentiate SO bore, WN neck, BLIND plate; block unknown flange types. |
| VALVE | GATE, GLOBE, BALL, SWING_CHECK, WAFER_CHECK, BUTTERFLY_WAFER, CONTROL | `COMPONENT_TEMPLATE` for listed types | No generic valve fallback; add dedicated wafer-check and control-valve symbols. |
| FITTING | ELBOW_90, ELBOW_45, TEE_STRAIGHT, TEE_REDUCING, CROSS, CAP | `COMPONENT_TEMPLATE` for listed types | Add reducing tee and cross symbols; block unknown fitting subtypes. |
| REDUCER | CONCENTRIC, ECCENTRIC | `COMPONENT_TEMPLATE` | Keep dedicated reducer symbols; tune eccentric centreline and length labels. |
| GASKET | FLAT_RING, FULL_FACE, RTJ, SPIRAL_WOUND | `COMPONENT_TEMPLATE` | Differentiate full-face/spiral/RTJ ring details; block unknown gasket subtypes. |
| OLET | WELDOLET, SOCKOLET, THREDOLET, ELBOLET | `APPROX_TEMPLATE` | Render first-pass branch-connection symbols and mark for visual tuning. |
| SUPPORT | manual review source family | `MISSING_TEMPLATE` | Do not render until support symbol taxonomy is defined. |

## Non-negotiable rendering rules

1. A component may render only if its family/subtype is registered in `PIPE_SPEC_SVG_SUPPORTED_TYPES`.
2. Unsupported valves must not fall back to gate-valve geometry.
3. Unsupported fittings/flanges/gaskets/olets must show an explicit missing-template reason.
4. The right inspector must display `SVG Fidelity`, `SVG Quality`, `SVG Reason`, and `Audit Action`.
5. The centre SVG canvas remains the only visual rendering host.

## Next visual-fidelity passes

1. Capture golden fixtures for one representative row per supported subtype.
2. Compare fixture SVGs against source component drawings or accepted piping symbols.
3. Tune symbols in this order: wafer-check, butterfly wafer, control valve, WN/SO/BLIND flange, weldolet/sockolet/thredolet/elbolet.
4. Add a table-level SVG status column after the symbols are visually acceptable.
5. Add interactive dimension highlighting only after the symbol geometry is trustworthy.
