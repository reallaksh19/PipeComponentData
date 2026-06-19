# Wave 13D — SVG Detail Routing

## Objective

Route the PipeSpec detail panel through the uploaded `PipeSpecSVG` vendor engine instead of the older legacy registry fallback.

## Scope

- Preserve the vendored SVG source under `pipetools/vendor/pipespec-svg/`.
- Map nested normalized DB rows into the flat `PipeSpecSVG` schema.
- Mount source SVG asynchronously inside the detail panel.
- Show explicit `SVG not available` output for unsupported rows.

## Supported source SVG routes

- `PIPE`
- `VALVE / GATE`
- `FLANGE / WN`
- `FLANGE / SO`
- `FLANGE / BLIND`
- `FITTING / ELBOW_90`
- `FITTING / ELBOW_45`
- `FITTING / TEE_STRAIGHT`
- `FITTING / CAP`
- `GASKET / FLAT_RING`
- `GASKET / RTJ`
- `GASKET / SPIRAL_WOUND`

## Non-goals

- No SVG source rewrite.
- No component type guessing for unsupported components.
- No fallback from `ELBOW_45` to `ELBOW_90`.
- No fallback from unsupported support rows to pipe/valve/flange drawings.

## Acceptance gate

`gates/pipetools-agent-19-svg-detail-routing.gate.test.js` verifies:

- nested row values map into the source SVG schema,
- detail panel uses a source SVG mount host,
- unsupported components render explicit unavailable state,
- 45-degree elbow routing remains distinct,
- cumulative CI/Pages gates include Agent 19.
