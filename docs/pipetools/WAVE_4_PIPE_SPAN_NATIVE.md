# Wave 4 — Pipe Span Native Module

## Scope

Wave 4 replaces the initial Pipe Span placeholder with a native static JavaScript module derived from `Pipe Span Check-FINAL ISSUE.xlsx`.

## Governance

- Branch: `agent07/wave-4-pipe-span-native`
- No direct commit to `main`.
- Open PR first and merge only after review.
- New source modules must stay below 200 lines unless explicitly approved.
- Every behavior added in this wave must have gate coverage.

## Implemented module boundaries

- `pipeSpan/catalog.js`: Excel-derived constants, pipe schedule rows, QMS references, validation cases.
- `pipeSpan/weights.js`: pipe, insulation, water, total weight, moment of inertia.
- `pipeSpan/spans.js`: indentation, stress, deflection, and span-case functions.
- `pipeSpan/trace.js`: auditable formula trace records.
- `pipeSpan/calculate.js`: public calculation model and QMS lookup.
- `pipeSpan/ui.js`: UI binding for inputs, result table, and formula trace.

## Validation source

Validation cases are taken from the four Excel sample sheets:

- `Sample Cal-Bare+Vapour`
- `Sample Cal-Insul+Vapour`
- `Sample Cal-Bare+Water`
- `Sample Cal-Insul+Water`

The gate checks total weight, continuous stress span, continuous deflection span, governing span, and QMS span for NPS 2 Sch 40.

## Cumulative checks

Wave 4 adds:

```bash
node --test gates/pipetools-agent-07-pipe-span.gate.test.js
```

CI must also retain Agent 00-03, Agent 04, Agent 05, and Agent 06 gates.