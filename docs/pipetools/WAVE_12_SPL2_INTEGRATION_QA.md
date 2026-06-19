# Wave 12 — SPL2 Source-Copy Integration QA

## Intent

The 2D Bundle / SPL2 module is treated as a vendored source copy from `reallaksh19/Simplified_Analysis`, not as a native PipeTools rewrite.

## Scope

- Keep the copied SPL2 source UI, IDs, options, canvases, and import graph intact.
- Use the existing PipeTools iframe route: `pipetools/` -> `../spl2-bundle/spl2_master.html`.
- Verify source tabs and browser-smoke critical controls are present.
- Verify all SPL2 HTML stylesheet/script references resolve inside `spl2-bundle/`.
- Verify all `spl2_master.js` module imports resolve inside `spl2-bundle/js/spl2/`.
- Verify Pages publishes and cache-busts the iframe assets.

## Non-goals

- No SPL2 layout redesign.
- No ID renaming.
- No calculation simplification.
- No PipeTools native-state sharing with SPL2.

## Gate

`gates/pipetools-agent-15-spl2-integration.gate.test.js`
