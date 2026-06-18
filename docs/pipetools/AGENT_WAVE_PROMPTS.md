# PipeTools Agent Wave Prompts

This document defines the first three implementation waves. Each wave is designed so one agent can own the branch, implementation, tests, and PR. The orchestrator only reviews, requests changes, and merges after checks pass.

## Global rules for every wave

1. Create a new branch before coding. Branch format: `agentXX/wave-N-short-scope`.
2. Do not commit directly to `main`.
3. Open a draft PR early. Mark ready only after local tests pass.
4. No new source module may exceed 200 lines unless approved in the PR description.
5. Keep changes modular and expandable. Prefer small files with single responsibility.
6. Do not mix UI, data, formulas, search, SVG, and tests in the same source file.
7. Every wave must include tests or a gate script that can run in CI.
8. Every wave must update or add a GitHub Actions workflow if the new checks are not already covered.
9. The PR body must list changed files, test commands, CI status, known limitations, and follow-up work.
10. The PR must not be merged until all required CI/V&V checks pass.
11. The agent must not merge its own PR. The orchestrator reviews and merges only after checks pass.
12. If a legacy or generated file must exceed 200 lines, request approval in the PR before adding it.

## Existing foundation assumptions

The current static app foundation lives under:

```text
pipetools/
├── index.html
├── pipetools.css
└── js/
    ├── app.js
    ├── data.js
    ├── pipeSpanCalc.js
    ├── render.js
    └── svg.js
```

The first three waves must extend this foundation without converting the app to a different framework. Keep implementation as browser-compatible ES modules unless a later architecture PR approves a framework migration.

Shared invariants:

```text
Dashboard state -> filtered rows -> selected row -> inspector/SVG preview
```

Canonical data concepts expected by all waves:

```js
{
  component: "VALVE" | "PIPE" | "FLANGE" | "FITTING" | "GASKET" | "SUPPORT",
  type: "GATE" | "GLOBE" | "CHECK" | "WN" | "ELBOW_90" | "PIPE_STRAIGHT",
  endType: "FLANGED" | "BUTT_WELD" | "SOCKET_WELD" | "THREADED" | null,
  facing: "RF" | "RTJ" | "FF" | null,
  classRating: "CL150" | "CL300" | "CL600" | "CL900" | "CL1500" | null,
  nps: 8,
  dn: 200,
  schedule: "SCH40" | "SCH80" | null,
  svgKey: "VALVE_GATE_FLANGED_RF",
  status: "READY" | "PARTIAL" | "MISSING"
}
```

---

## Wave 1 — Agent 04: Engineering Search Foundation

### Branch

`agent04/wave-1-engineering-search`

### Objective

Build the structured engineering search layer for PipeTools. The search must parse practical user queries and convert them into dashboard/table filters, parsed chips, diagnostics, and ranked results.

### User behavior to support

A user can type:

```text
GATE 8" FL 300#
```

The system must interpret it as:

```text
Component: VALVE
Type: GATE
NPS: 8
End Type: FLANGED
Class: CL300
Facing: Any / not specified
```

The UI layer in Wave 3 will later use this parsed object to activate dashboard cards and filter the table.

### Scope

- Alias dictionary.
- Query normalization.
- Engineering token parser.
- Inference rules.
- Conflict cleanup rules.
- Search result scoring.
- Parsed-chip model.
- Search result diagnostics.
- Unit tests and CI gate.

### Out of scope

- Do not build the visual search bar UI.
- Do not build dashboard rendering.
- Do not build SVG rendering.
- Do not rewrite the existing app shell.
- Do not load external search libraries unless justified in the PR.

### Required files

```text
pipetools/js/search/aliases.js
pipetools/js/search/normalize.js
pipetools/js/search/parse.js
pipetools/js/search/infer.js
pipetools/js/search/rank.js
pipetools/js/search/chips.js
pipetools/js/search/index.js
gates/pipetools-agent-04-search.gate.test.js
```

Each source file above must remain below 200 lines.

### Required public API

`pipetools/js/search/index.js` must export:

```js
export function parseEngineeringSearch(query) {}
export function applySearchToRows(query, rows, options = {}) {}
export function createSearchChips(parsed) {}
```

`parseEngineeringSearch(query)` must return this shape:

```js
{
  raw: "GATE 8\" FL 300#",
  normalized: "GATE 8 IN FL 300 #",
  filters: {
    component: "VALVE",
    type: "GATE",
    endType: "FLANGED",
    facing: null,
    classRating: "CL300",
    nps: 8,
    dn: null,
    schedule: null
  },
  chips: [
    { key: "component", label: "Component", value: "Valve" },
    { key: "type", label: "Type", value: "Gate" },
    { key: "nps", label: "NPS", value: "8" },
    { key: "endType", label: "End", value: "Flanged" },
    { key: "classRating", label: "Class", value: "CL 300" }
  ],
  warnings: [],
  diagnostics: {
    matchedAliases: [],
    remainingTerms: []
  }
}
```

`applySearchToRows(query, rows)` must return:

```js
{
  parsed,
  results: [
    {
      row,
      score: 420,
      reasons: ["type:GATE", "nps:8", "class:CL300"]
    }
  ],
  exactCount: 1,
  totalCount: 1
}
```

### Alias dictionary requirements

At minimum support these aliases:

```js
component: {
  VALVE: ["VALVE", "VLV", "VL"],
  PIPE: ["PIPE", "PIP"],
  FLANGE: ["FLANGE", "FLG-COMPONENT"],
  FITTING: ["FITTING", "FIT"],
  GASKET: ["GASKET", "GSK"],
  SUPPORT: ["SUPPORT", "SUP"]
}
```

```js
valveType: {
  GATE: ["GATE", "GV", "GTV"],
  GLOBE: ["GLOBE", "GLV"],
  CHECK: ["CHECK", "NRV", "NON RETURN"],
  BALL: ["BALL", "BV"],
  BUTTERFLY: ["BUTTERFLY", "BFV"],
  PLUG: ["PLUG"]
}
```

```js
endType: {
  FLANGED: ["FLANGED", "FLANGE END", "FLG", "FL"],
  BUTT_WELD: ["BUTT WELD", "BUTTWELD", "BW", "B/W"],
  SOCKET_WELD: ["SOCKET WELD", "SOCKET", "SW", "S/W"],
  THREADED: ["THREADED", "THREAD", "THD", "NPT", "SCRD"]
}
```

```js
facing: {
  RF: ["RF", "RAISED FACE"],
  RTJ: ["RTJ", "RING TYPE JOINT", "RING JOINT"],
  FF: ["FF", "FLAT FACE"]
}
```

```js
classRating: {
  CL150: ["150", "150#", "CL150", "CL 150", "CLASS150", "CLASS 150", "150LB"],
  CL300: ["300", "300#", "CL300", "CL 300", "CLASS300", "CLASS 300", "300LB"],
  CL600: ["600", "600#", "CL600", "CL 600", "CLASS600", "CLASS 600", "600LB"],
  CL900: ["900", "900#", "CL900", "CL 900", "CLASS900", "CLASS 900", "900LB"],
  CL1500: ["1500", "1500#", "CL1500", "CL 1500", "CLASS1500", "CLASS 1500", "1500LB"]
}
```

### Parser requirements

Detect these patterns:

```text
8"          -> nps: 8
8 IN        -> nps: 8
NPS8        -> nps: 8
NPS 8       -> nps: 8
DN200       -> dn: 200
DN 200      -> dn: 200
300#        -> classRating: CL300
CL300       -> classRating: CL300
CL 300      -> classRating: CL300
CLASS 300   -> classRating: CL300
300LB       -> classRating: CL300
SCH80       -> schedule: SCH80
SCH 80      -> schedule: SCH80
STD         -> schedule: STD
XS          -> schedule: XS
XXS         -> schedule: XXS
```

### Inference rules

Implement these rules in `infer.js`:

1. A valve type implies `component = VALVE`.
2. A flange type such as `WN`, `SO`, `BLIND`, `LJ` implies `component = FLANGE`.
3. A fitting type such as `ELBOW`, `TEE`, `REDUCER`, `CAP` implies `component = FITTING`.
4. `RF`, `RTJ`, or `FF` implies `endType = FLANGED` if no end type is present.
5. If `endType` is not `FLANGED`, clear `facing` and add a warning if facing was present.
6. `FL` is context-sensitive: if a valve type exists, treat `FL` as flanged end; if flange type exists, treat as flange component context.
7. Bare numeric class tokens such as `300` should become class only when another size token exists or the token is suffixed by `#`, `LB`, `CL`, or `CLASS`.

### Scoring requirements

Implement deterministic scoring in `rank.js`:

```text
component exact match: +100
type exact match: +120
nps exact match: +90
dn exact match: +90
classRating exact match: +80
endType exact match: +70
facing exact match: +60
schedule exact match: +50
READY status: +10
```

Sort by score descending, then by stable row id ascending.

### Must support these queries

```text
GATE 8" FL 300#
gate 8 flg cl300
GATE DN200 RF 300
globe 4 bw 150
flange wn rf 6 300
elbow 90 lr 8 sch80
```

### Acceptance tests

The gate test must verify:

- `GATE 8" FL 300#` returns component `VALVE`, type `GATE`, NPS `8`, end `FLANGED`, class `CL300`.
- `gate 8 flg cl300` returns the same canonical filters as above.
- `GATE DN200 RF 300` infers `FLANGED` from `RF`.
- `globe 4 bw 150` clears facing and returns BW valve filters.
- `flange wn rf 6 300` resolves component `FLANGE`, type `WN`, facing `RF`, class `CL300`, NPS `6`.
- `elbow 90 lr 8 sch80` resolves component `FITTING`, fitting type `ELBOW_90_LR`, NPS `8`, schedule `SCH80`.
- Parser output includes parsed chips suitable for UI display.
- Applying search to sample rows returns ranked results in deterministic order.
- `node --test gates/pipetools-agent-04-search.gate.test.js` passes.

### CI requirement

If `pipetools-ci.yml` does not already run this gate, update it to run:

```bash
node --test gates/pipetools-agent-04-search.gate.test.js
```

### Agent prompt

You are Agent 04 for PipeTools. Create a modular engineering search layer in `pipetools/js/search`. Work only on branch `agent04/wave-1-engineering-search`. Keep every source module under 200 lines. Add query normalization, alias matching, engineering parsing, inference, ranking, parsed chips, and tests. Do not build visual UI. Do not merge. Open a draft PR and report changed files, test command, CI status, limitations, and follow-up work.

---

## Wave 2 — Agent 05: SVG Library and Inspector Binding

### Branch

`agent05/wave-2-svg-library`

### Objective

Create the first reusable SVG library and bind selected PipeSpec rows to a technical preview renderer. The SVG system must be deterministic, safe, and independent from search/table filtering.

### User behavior to support

When a table row has:

```js
{
  svgKey: "VALVE_GATE_FLANGED_RF",
  f2f: 267,
  height: 767,
  weight: 88
}
```

The inspector must be able to render a gate valve RF technical preview with dynamic F2F and height labels.

### Scope

- Compact dashboard icons for component cards.
- Detail SVG renderers for first valve/flange/fitting/pipe/support keys.
- SVG registry.
- Controlled fallback SVG.
- Row-to-SVG resolution.
- Inspector render helper.
- Unit tests and CI gate.

### Out of scope

- Do not build dashboard/table UI.
- Do not write search logic.
- Do not copy vendor drawings, catalog images, or standard figures.
- Do not hardcode PipeSpec table rows inside SVG files.

### Required files

```text
pipetools/js/svg/icons.js
pipetools/js/svg/valves.js
pipetools/js/svg/flanges.js
pipetools/js/svg/fittings.js
pipetools/js/svg/pipes.js
pipetools/js/svg/supports.js
pipetools/js/svg/registry.js
pipetools/js/svg/inspector.js
gates/pipetools-agent-05-svg.gate.test.js
```

Each source file above must remain below 200 lines.

### Required public API

`pipetools/js/svg/registry.js` must export:

```js
export function getSvgRenderer(svgKey) {}
export function hasSvgRenderer(svgKey) {}
export function listSvgKeys() {}
```

`pipetools/js/svg/inspector.js` must export:

```js
export function renderSvgPreview(row, options = {}) {}
export function resolveSvgKey(row) {}
```

`renderSvgPreview(row)` must return a string of safe inline SVG markup.

### SVG renderer signature

Every renderer must use this signature:

```js
export function renderGateFlangedRf(row, options = {}) {
  return `<svg ...>...</svg>`;
}
```

Renderers may read these row fields if present:

```text
f2f
f2fRf
f2fRtj
height
weight
nps
dn
classRating
facing
endType
standard
```

Missing dimension values must render as `--`, not `undefined` or `NaN`.

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

### SVG design standard

All detail SVGs must follow this standard:

```text
viewBox: 0 0 420 300
main stroke: #dbeafe or currentColor-compatible equivalent
dimension stroke: #38bdf8
centerline stroke: #64748b dashed
background: transparent or dark panel rectangle
font size: 12 to 16
no external image references
no script tags
no foreignObject
```

All dashboard icons must follow this standard:

```text
viewBox: 0 0 24 24
stroke width: 1.8 to 2.2
single-color currentColor-compatible SVG
no text labels inside icon SVG
```

### Fallback behavior

If row has no `svgKey` or unknown `svgKey`, render a fallback SVG with this message:

```text
SVG not available for selected variant
```

The fallback must not throw.

### Safety requirements

- Escape any row-provided text used inside SVG text nodes.
- Do not inject raw HTML from row data.
- Do not include `<script>`, `<foreignObject>`, `onload`, or inline event handlers.
- Do not reference external URLs.

### Acceptance tests

The gate test must verify:

- Every required SVG key resolves to a renderer.
- Unknown SVG key returns fallback renderer.
- Gate flanged RF SVG displays F2F and height from row data.
- Gate flanged RTJ SVG displays RTJ-specific label or facing text.
- Butt-weld valve SVG does not show RF/RTJ facing as active.
- `renderSvgPreview(row)` works from only `row.svgKey` and row dimensions.
- SVG output contains `<svg` and no `<script` or `<foreignObject`.
- Missing dimensions render as `--`.
- `node --test gates/pipetools-agent-05-svg.gate.test.js` passes.

### CI requirement

If `pipetools-ci.yml` does not already run this gate, update it to run:

```bash
node --test gates/pipetools-agent-05-svg.gate.test.js
```

### Agent prompt

You are Agent 05 for PipeTools. Create a modular SVG library in `pipetools/js/svg`. Work only on branch `agent05/wave-2-svg-library`. Keep every source module under 200 lines. Add compact dashboard icons, detail SVG renderers, registry, fallback, row-to-SVG resolution, and inspector render helper. SVGs must use consistent viewBox/style and dynamic dimensions from row data. Do not copy copyrighted vendor or standard drawings. Add tests and CI coverage. Do not merge. Open a draft PR and report changed files, test command, CI status, limitations, and follow-up work.

---

## Wave 3 — Agent 06: PipeSpec Dashboard Integration

### Branch

`agent06/wave-3-pipespec-dashboard`

### Objective

Wire the PipeSpec UI into a dashboard-table-inspector workflow using existing data, Agent 04 search interfaces, and Agent 05 SVG registry.

### User behavior to support

A user can either click dashboard cards:

```text
VALVE -> GATE -> FLANGED -> RF -> CL150 -> NPS 6
```

or type:

```text
GATE 8" FL 300#
```

Both paths must update the same dashboard state, filter the same table, and show the selected row in the same inspector.

### Scope

- Component dashboard strip.
- Component-specific subtype dashboard strip.
- Configuration strip.
- Dynamic results table.
- Selected-row inspector.
- Search-to-dashboard synchronization.
- Empty, loading, and no-result states.
- Tests and CI gate.

### Out of scope

- Do not implement the search parser. Use Agent 04 public API.
- Do not implement SVG internals. Use Agent 05 public API.
- Do not build Pipe Span calculations.
- Do not rewrite all existing foundation files if a small adapter can work.

### Required files

```text
pipetools/js/pipespec/state.js
pipetools/js/pipespec/filters.js
pipetools/js/pipespec/dashboard.js
pipetools/js/pipespec/table.js
pipetools/js/pipespec/inspector.js
pipetools/js/pipespec/searchSync.js
pipetools/js/pipespec/index.js
gates/pipetools-agent-06-dashboard.gate.test.js
```

Each source file above must remain below 200 lines.

### Required public API

`pipetools/js/pipespec/state.js` must export:

```js
export function createInitialPipeSpecState() {}
export function reducePipeSpecState(state, action) {}
export function clearInvalidSelections(state) {}
```

Expected state shape:

```js
{
  filters: {
    component: "VALVE",
    type: "GATE",
    endType: "FLANGED",
    facing: "RF",
    classRating: "CL150",
    nps: 6,
    dn: null,
    schedule: null
  },
  selectedRowId: null,
  searchQuery: "",
  chips: [],
  warnings: []
}
```

`pipetools/js/pipespec/filters.js` must export:

```js
export function filterPipeSpecRows(rows, filters) {}
export function getDashboardCounts(rows, filters) {}
export function isFacingApplicable(filters) {}
```

`pipetools/js/pipespec/searchSync.js` must export:

```js
export function applySearchResultToState(state, searchResult) {}
```

`pipetools/js/pipespec/index.js` must expose the integration entry point:

```js
export function mountPipeSpecDashboard(root, options = {}) {}
```

### State rules

- `component` change clears all component-specific fields.
- `type` change clears `selectedRowId`.
- `endType` change clears `selectedRowId`.
- If `endType !== "FLANGED"`, clear `facing`.
- `facing` dashboard is visible only when `endType === "FLANGED"` or no end type is selected but the selected component supports facings.
- Table rows are always derived from `state.filters`; no hidden table-only filters.
- Selected row must be cleared when filters no longer include it.

### Dashboard rendering requirements

Component strip must include at minimum:

```text
Pipe
Valve
Flange
Fitting
Gasket
Support
```

Valve subtype strip must include at minimum:

```text
Gate
Globe
Check
Ball
Butterfly
Plug
```

Configuration strip must include at minimum:

```text
End: Flanged, Butt-Weld, Socket-Weld, Threaded
Facing: RF, RTJ, FF
Class: CL150, CL300, CL600, CL900, CL1500
Size: available NPS values from current filtered rows
```

Dashboard cards must show:

```text
label
count
selected/available/disabled state
```

### Table requirements

The table must show these common columns for valves:

```text
Type
End Connection
Facing
NPS / DN
Class
F2F
Height
Weight
Status
```

Rows must include stable `data-row-id` attributes. The selected row must be visually marked with a selected class.

### Inspector requirements

Inspector must use Agent 05:

```js
renderSvgPreview(row)
```

Inspector must show:

```text
selected item title
end/facing/class/size summary
SVG preview
active dimensions
standard/source/status
```

No selected row state:

```text
Select a row to view SVG and dimensions.
```

### Search synchronization

When user searches:

```text
GATE 8" FL 300#
```

Wave 3 must call Agent 04:

```js
applySearchToRows(query, rows)
```

Then synchronize filters and chips into PipeSpec state.

Do not duplicate parsing regexes or aliases in Wave 3.

### Acceptance tests

The gate test must verify:

- `createInitialPipeSpecState()` returns valid default filters.
- Clicking/dispatching `VALVE -> GATE -> FLANGED -> RF -> CL150` filters rows correctly.
- Changing end connection from flanged to BW clears RF/RTJ/FF.
- Search `GATE 8" FL 300#` activates the same dashboard state as manual filter actions.
- Selecting a row updates inspector title, dimensions, and SVG key.
- If filters exclude the selected row, selected row is cleared.
- No-result state is produced for invalid filter combinations.
- Dashboard counts update after each parent filter change.
- `node --test gates/pipetools-agent-06-dashboard.gate.test.js` passes.

### CI requirement

If `pipetools-ci.yml` does not already run this gate, update it to run:

```bash
node --test gates/pipetools-agent-06-dashboard.gate.test.js
```

### Agent prompt

You are Agent 06 for PipeTools. Build the PipeSpec dashboard integration in `pipetools/js/pipespec`. Work only on branch `agent06/wave-3-pipespec-dashboard`. Keep every source module under 200 lines. Use Agent 04 search interfaces and Agent 05 SVG registry; do not duplicate their logic. Dashboard state must drive table rows, selected rows must drive inspector SVG, and search must sync into the same state. Add tests and CI coverage. Do not merge. Open a draft PR and report changed files, test command, CI status, limitations, and follow-up work.

---

## Orchestrator review checklist for all three waves

Before merge, verify:

```text
Branch name is correct.
PR is not direct to main by the agent.
No new source module exceeds 200 lines unless approved.
All new source files have single responsibility.
Gate test exists and passes.
CI workflow includes the new gate.
Existing PipeTools foundation still loads.
No agent duplicated another agent's owned logic.
PR body includes changed files, tests, CI status, limitations, and follow-up work.
```

Merge policy:

```text
Wave 1 must merge before Wave 3.
Wave 2 must merge before Wave 3.
Wave 3 may be rebased after Wave 1 and Wave 2 merge.
The orchestrator handles review and merge only after all checks pass.
```
