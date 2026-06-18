# Wave 4 — Pipe Span Native Module

## Scope

Wave 4 replaces the initial Pipe Span placeholder with a native static JavaScript module derived from `Pipe Span Check-FINAL.xlsx`.

## Governance

- Branch: `agent07/wave-4-pipe-span-native`
- No direct commit to `main`.
- Open PR first and merge only after review.
- New source modules must stay below 200 lines unless explicitly approved.
- Every behavior added in this wave must have gate coverage.

## Implemented module boundaries

- `pipeSpan/catalog.js`: Excel-derived constants, pipe schedule rows, QMS references, validation cases.
- `pipeSpan/weights.js`: pipe, insulation, water, total weight, moment of inertia.
- `pipeSpan/spans.js`: indentation, stress, deflection, selected-method, least-allowable, and governing span functions.
- `pipeSpan/trace.js`: auditable formula trace records that match returned result fields.
- `pipeSpan/calculate.js`: public calculation model, input normalization, and QMS lookup.
- `pipeSpan/ui.js`: UI binding for inputs, separated span outputs, and formula trace.

## Validation source

Validation cases are taken from the four Excel sample sheets:

- `Sample Cal-Bare+Vapour`
- `Sample Cal-Insul+Vapour`
- `Sample Cal-Bare+Water`
- `Sample Cal-Insul+Water`

The gate checks total weight, continuous stress span, continuous deflection span, selected method span, least allowable span, governing span, and QMS span for NPS 2 Sch 40.

## Span output definitions

- `selectedMethodSpanM`: minimum of the deflection and stress span for the selected beam method.
- `leastAllowableSpanM`: minimum of indentation span and every calculated method span.
- `governingSpanM`: minimum of `selectedMethodSpanM` and `indentationSpanM`.

## Schedule normalization

`normalizePipeSpanInput()` normalizes unavailable schedules when NPS changes. `getPipeSpanRow()` does not silently fall back when an explicit unavailable schedule is requested; it throws an error so invalid direct lookups are visible.

## Cumulative checks

Wave 4 adds:

```bash
node --test gates/pipetools-agent-07-pipe-span.gate.test.js
```

CI must also retain Agent 00-03, Agent 04, Agent 05, and Agent 06 gates.
