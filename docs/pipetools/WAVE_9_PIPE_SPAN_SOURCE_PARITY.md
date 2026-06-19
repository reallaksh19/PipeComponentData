# Wave 9 — Pipe Span Source-Parity Revamp

## Scope

This wave improves the PipeTools **Pipe Span** tab using the layout pattern from `CRF-4-1 > Misc Calc`.

The SVG package migration is intentionally excluded. The user will provide separate SVG source files for the next SVG-specific wave.

## Implemented

- Pipe Span tab now uses a calculator rail, header, center input/result area, right engineering sketch, and formula console.
- Unit Mode control is shown to match source layout; non-native modes remain disabled until conversion rules are added.
- Results now show method comparison rows: continuous, average, fixed, simply supported, indentation, and governing span.
- Pipe span engineering sketch now shows supports, pipe OD/wall, distributed load, governing span, and QMS reference span.
- Added cumulative Agent 12 verification gate.

## Source reference

- `reallaksh19/CRF-4-1`: `misc calc update/viewer/tabs/misc-calc-layout.js`
- `reallaksh19/CRF-4-1`: `misc calc update/viewer/tabs/misc-calc-tab.js`

## Non-goals

- No SVG audit package migration.
- No change to existing Pipe Span formula engine.
- No 2D Bundle/SPL2 source-parity changes in this wave.
