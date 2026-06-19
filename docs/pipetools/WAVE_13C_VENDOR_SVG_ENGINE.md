# Wave 13C — Vendor PipeSpec SVG Engine

## Scope

This wave vendors the uploaded PipeSpec SVG engine from `Database webpage redesign (4).zip` and adds a thin adapter for current normalized DB rows.

## Included

- `pipetools/vendor/pipespec-svg/svg-engine.js` copied as source.
- `pipeSpecSvgAdapter.js` maps normalized PipeTools rows into the renderer schema.
- `pipeSpecSvgEngine.js` loads the vendor browser global and exposes mount/build helpers.
- Agent 18 gate validates vendor presence, API, sample SVG rendering, and adapter routing.

## Out of scope

- No detail-panel replacement yet.
- No renderer rewrite.
- No SVG logic simplification.
- No DB promotion beyond existing normalized rows.

## Next

Wave 13D should connect the detail panel to this adapter and ensure selected rows render the vendor SVG instead of the old partial SVG functions.
