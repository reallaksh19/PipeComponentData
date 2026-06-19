# Wave 13E — SVG Detail Panel Actions

## Objective

Enhance the PipeSpec DB detail panel after Wave 13D routing so the selected source-backed SVG row can be inspected and reused without changing vendor SVG rendering logic.

## Scope

- Keep the vendor `PipeSpecSVG` engine as the rendering authority.
- Add a small action layer around the detail panel.
- Add a detailed-view icon/button for normalized row JSON.
- Add Copy JSON for the selected row.
- Add Open SVG Preview for the mounted SVG.
- Keep unsupported rows explicit: no fallback renderer is used for supported/unsupported ambiguity.

## Files

- `pipetools/js/pipespecInspector.js`
- `pipetools/js/pipespecDetailActions.js`
- `pipetools/js/render.js`
- `pipetools/pipetools.css`
- `gates/pipetools-agent-20-svg-detail-actions.gate.test.js`

## Non-goals

- No change to the copied SVG engine internals.
- No component routing rewrite.
- No DB schema rewrite.
- No SPL2 changes.
