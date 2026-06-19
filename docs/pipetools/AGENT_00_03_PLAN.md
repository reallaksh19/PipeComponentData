# PipeTools Suite — Agent 00 to Agent 03 Foundation

Branch: `feature/pipetools-agent-00-03-foundation`

## Agent 00 — Architecture

PipeTools is added as a static GitHub Pages app beside the existing Studio app. The first foundation avoids a new dependency stack so the current Node test pipeline remains stable.

Architecture rule:

```text
Dashboard state -> filtered table -> selected row -> SVG / calculation inspector
```

Modules registered in the shell:

- PipeSpec DB
- Pipe Span
- 2D Bundle Calc
- Pipe Spacing
- Section Designer
- Reports
- Settings

## Agent 01 — UI System

Reusable UI is implemented as static app primitives:

- top bar
- module tabs
- compact dashboard strips
- icon cards
- segmented buttons
- table shell
- inspector panel
- SVG preview cards

Every new PipeTools native source module is kept below the relaxed 300-line gate.

## Agent 02 — App Shell and Pages

The app is rooted at `pipetools/index.html` and is copied to `_site/pipetools/` by the Pages workflow. The 2D bundle is isolated as an iframe target at `spl2-bundle/spl2_master.html`.

The upstream SPL2 React wrapper uses an iframe pointed at `spl2-bundle/spl2_master.html`; this foundation keeps the same static boundary but defers full legacy bundle import until large-file approval.

## Agent 03 — Data and Calculation Model

PipeSpec data is loaded from existing normalized repo artifacts:

```text
data/normalized/valves.json
```

Pipe Span has a formula module derived from the uploaded Excel workbook. The first implemented sheet coverage validates the governing calculation path for:

- NPS 8, Sch 40, bare vapour
- NPS 8, Sch 40, insulated water

The formula module separates calculation from UI and returns a result object for display.

## Acceptance Criteria

- Branch exists before coding.
- PipeTools static app loads without backend dependencies.
- PipeSpec DB tab reads source-backed valve data.
- Pipe Span tab calculates Excel-derived spans.
- 2D Bundle Calc tab has an isolated iframe boundary.
- Pages workflow copies PipeTools and the bundle boundary.
- Gate test validates routes, line limits, and span results.
