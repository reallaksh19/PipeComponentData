# Wave 13I — PipeSpec Dashboard State + SVG Workbench

## Objective

Convert the PipeSpec DB page from a long diagnostic page into a compact engineering workbench loop:

```text
component → subtype/config filters → table → SVG inspector
```

## Implemented

- Fixed workbench remains `100vh`; only the table and inspector scroll.
- Component family dashboard stays compact above the table.
- Subtypes are compact chips with row counts.
- Table columns are selected from a component registry map instead of generic key fields only.
- Inspector width is enlarged to 460 px.
- SVG canvas is large, light, and kept near the top of the inspector.
- Inspector has `SVG`, `Details`, and `JSON` views.
- JSON is hidden by default and remains available through the JSON tab/copy action.
- SVG route keys are deterministic and row-driven.

## Guardrails

- The uploaded vendor `PipeSpecSVG` engine remains unchanged.
- Unsupported families must continue to show explicit no-SVG messaging.
- REDUCER, OLET, and SUPPORT must not render a wrong fallback SVG.
- Existing Pipe Span and SPL2 iframe boundaries are unchanged.

## Gate

`gates/pipetools-agent-24-dashboard-state-svg.gate.test.js`
