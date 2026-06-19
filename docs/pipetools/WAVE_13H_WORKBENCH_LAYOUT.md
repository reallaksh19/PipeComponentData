# Wave 13H — PipeSpec Workbench Layout

## Goal
Convert PipeSpec DB from a long vertically stacked website page into a fixed-height engineering workbench.

## Changes
- App shell uses `100vh` desktop layout.
- Full-page vertical scroll is disabled on desktop.
- DB coverage is compressed to a one-line `DB Health` bar with collapsed details.
- Component dashboard is moved directly below DB Health.
- Subtype selection uses compact chips.
- Filter row uses compact horizontal chips.
- Table and inspector are the only desktop work areas that scroll.
- Inspector remains visible in the right column while the table scrolls.

## Guardrails
- No database row promotion in this wave.
- No SVG engine change in this wave.
- Existing Pipe Span and SPL2 routes remain untouched.
- Native PipeTools modules remain below the relaxed 300-line gate.

## Acceptance
- Table starts in the first viewport.
- Selected row inspector remains visible without page scrolling.
- Coverage diagnostics are available only behind Details by default.
