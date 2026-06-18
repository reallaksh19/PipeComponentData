# PipeTools Agent Wave Prompts

This document defines the first three implementation waves. Each wave is designed so one agent can own the branch, implementation, tests, and PR. The orchestrator only reviews, requests changes, and merges after checks pass.

## Global rules for every wave

1. Create a new branch before coding. Branch format: `agentXX/wave-N-short-scope`.
2. Do not commit directly to `main`.
3. Open a draft PR early. Mark ready only after local tests pass.
4. No new source module may exceed 200 lines unless approved in the PR description.
5. Keep changes modular and expandable. Prefer small files with single responsibility.
6. Do not mix UI, data, formulas, and tests in the same file.
7. Every wave must include tests or a gate script that can run in CI.
8. Every wave must update or add a GitHub Actions workflow if the new checks are not already covered.
9. The PR body must list changed files, test commands, CI status, known limitations, and follow-up work.
10. The PR must not be merged until all required CI/V&V checks pass.

---

## Wave 1 — Agent 04: Engineering Search Foundation

### Branch

`agent04/wave-1-engineering-search`

### Objective

Build the structured engineering search layer for PipeTools. The search must parse practical user queries and convert them into dashboard/table filters.

### Scope

- Search aliases
- Query normalization
- Token parsing
- Engineering inference rules
- Search result scoring
- Parsed-chip model
- Unit tests and CI gate

### Must support these queries

```text
GATE 8" FL 300#
gate 8 flg cl300
GATE DN200 RF 300
globe 4 bw 150
flange wn rf 6 300
elbow 90 lr 8 sch80
```

### Required files

```text
pipetools/js/search/aliases.js
pipetools/js/search/normalize.js
pipetools/js/search/parse.js
pipetools/js/search/infer.js
pipetools/js/search/rank.js
pipetools/js/search/index.js
gates/pipetools-agent-04-search.gate.test.js
```

### Rules

- Keep each file under 200 lines.
- Do not rewrite `pipetools/js/app.js` unless necessary.
- Search must return a structured object, not only filtered rows.
- RF, RTJ, and FF must imply `FLANGED` when end connection is missing.
- RTJ must never remain selected with BW, SW, or threaded ends.
- `FL` must resolve by context: valve query means flanged end; flange query means flange component.

### Acceptance tests

- `GATE 8" FL 300#` returns component `VALVE`, type `GATE`, NPS `8`, end `FLANGED`, class `CL300`.
- `GATE DN200 RF 300` infers flanged end from RF.
- `globe 4 bw 150` clears facing and returns BW valve filters.
- `flange wn rf 6 300` resolves `FL`/flange context correctly.
- Parser output includes parsed chips suitable for UI display.
- `node --test gates/pipetools-agent-04-search.gate.test.js` passes.

### Agent prompt

You are Agent 04 for PipeTools. Create a modular engineering search layer. Work only on a new branch. Keep every source module under 200 lines. Add tests and CI coverage. The search must parse user-style engineering queries into structured filters and parsed chips. Do not merge. Open a PR and report test results.

---

## Wave 2 — Agent 05: SVG Library and Inspector Binding

### Branch

`agent05/wave-2-svg-library`

### Objective

Create the first reusable SVG library and bind selected PipeSpec rows to a technical preview in the detail panel.

### Scope

- Dashboard icons for components
- Detail SVGs for first valve/flange/fitting set
- SVG registry
- Fallback SVG
- Row-to-SVG resolution
- Inspector rendering tests

### Required SVG keys

```text
VALVE_GATE_FLANGED_RF
VALVE_GATE_FLANGED_RTJ
VALVE_GATE_BUTT_WELD_NA
VALVE_GLOBE_FLANGED_RF
VALVE_CHECK_FLANGED_RF
FLANGE_WN_RF
FLANGE_WN_RTJ
FLANGE_BLIND_RF
FITTING_ELBOW_90_LR
FITTING_TEE_EQUAL
PIPE_STRAIGHT
SUPPORT_GUIDE
SUPPORT_LINE_STOP
```

### Required files

```text
pipetools/js/svg/icons.js
pipetools/js/svg/valves.js
pipetools/js/svg/flanges.js
pipetools/js/svg/fittings.js
pipetools/js/svg/supports.js
pipetools/js/svg/registry.js
gates/pipetools-agent-05-svg.gate.test.js
```

### Rules

- Keep each file under 200 lines.
- Use one consistent SVG viewBox style.
- Dimension labels must accept values from selected row data.
- Missing SVG must show a controlled fallback, not a broken panel.
- Do not embed vendor-catalog drawings or copyrighted standard figures.
- Do not hardcode table row data inside SVG files.

### Acceptance tests

- Every required SVG key resolves to a renderer.
- Unknown SVG key returns fallback renderer.
- Gate flanged RF SVG can display F2F and height from row data.
- Inspector can render from `row.svgKey` without knowing valve type.
- `node --test gates/pipetools-agent-05-svg.gate.test.js` passes.

### Agent prompt

You are Agent 05 for PipeTools. Create a modular SVG library for technical previews. Work only on a new branch. Keep every source module under 200 lines. Add a registry and fallback. Bind selected row `svgKey` to the inspector preview. Add tests and CI coverage. Do not merge. Open a PR and report test results.

---

## Wave 3 — Agent 06: PipeSpec Dashboard Integration

### Branch

`agent06/wave-3-pipespec-dashboard`

### Objective

Wire the PipeSpec UI into a dashboard-table-inspector workflow using the existing data, Agent 04 search, and Agent 05 SVG registry.

### Scope

- Component dashboard strip
- Component-specific dashboard strip
- Configuration strip
- Dynamic results table
- Selected-row inspector
- Search-to-dashboard synchronization
- Empty, loading, and no-result states

### Required files

```text
pipetools/js/pipespec/state.js
pipetools/js/pipespec/filters.js
pipetools/js/pipespec/dashboard.js
pipetools/js/pipespec/table.js
pipetools/js/pipespec/inspector.js
pipetools/js/pipespec/index.js
gates/pipetools-agent-06-dashboard.gate.test.js
```

### Rules

- Keep each file under 200 lines.
- Do not duplicate search logic from Agent 04.
- Do not duplicate SVG logic from Agent 05.
- Changing parent filters must clear invalid child filters.
- Facing dashboard must show only for flanged configuration.
- Table must derive from state, not maintain separate hidden filters.
- Selected row must control inspector SVG and property list.

### Acceptance tests

- Clicking `VALVE > GATE > FLANGED > RF > CL150` filters rows correctly.
- Changing end connection from flanged to BW clears RF/RTJ/FF.
- Search `GATE 8" FL 300#` activates the same dashboard state as manual clicks.
- Selecting a row updates inspector title, dimensions, and SVG key.
- No-result state is shown for invalid filter combinations.
- `node --test gates/pipetools-agent-06-dashboard.gate.test.js` passes.

### Agent prompt

You are Agent 06 for PipeTools. Build the PipeSpec dashboard integration. Work only on a new branch. Keep every source module under 200 lines. Use Agent 04 search interfaces and Agent 05 SVG registry; do not duplicate their logic. Add tests and CI coverage. Do not merge. Open a PR and report test results.
