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

## Visual fixture review workflow

The visual review board is available at `pipetools/svg-fixtures.html` and is linked from the centre SVG toolbar as **Fixtures**.

Fixture source of truth:

- `pipetools/js/svg/pipeSpecSvgFixtures.js` contains one representative fixture per supported subtype.
- Each fixture carries a component row, expected audit status, renderability, normalized subtype, and human review checks.
- `pipetools/js/svg/pipeSpecSvgFixtureViewer.js` renders the board and groups fixtures by family.
- `gates/pipetools-svg-quality.gate.test.js` checks that fixture expectations match the audit adapter and that renderable fixtures do not fall back to unknown drawing text.

Priority-1 fixtures for visual tuning:

1. `valve-swing-check-fl-rf`
2. `valve-wafer-check`
3. `valve-butterfly-wafer`
4. `valve-control-fl-rf`
5. `flange-wn-rf`, `flange-so-rf`, `flange-blind-rf`
6. `reducer-eccentric`
7. `olet-weldolet`, `olet-sockolet`, `olet-thredolet`, `olet-elbolet`
8. `gasket-rtj`, `gasket-spiral-wound`

## Non-negotiable rendering rules

1. A component may render only if its family/subtype is registered in `PIPE_SPEC_SVG_SUPPORTED_TYPES`.
2. Unsupported valves must not fall back to gate-valve geometry.
3. Unsupported fittings/flanges/gaskets/olets must show an explicit missing-template reason.
4. The right inspector must display `SVG Fidelity`, `SVG Quality`, `SVG Reason`, and `Audit Action`.
5. The centre SVG canvas remains the only visual rendering host.
6. The fixture board must show pending/unsupported rows as blocked, not as approximate drawings.

## Next visual-fidelity passes

1. Open the fixture board and compare priority-1 SVGs against source component drawings or accepted piping symbols.
2. Tune geometry in `pipetools/vendor/pipespec-svg/svg-engine.js` using fixture IDs above as the review checklist.
3. After geometry is acceptable, add table-level SVG quality/status column.
4. Add interactive dimension highlighting only after symbol geometry is trustworthy.
