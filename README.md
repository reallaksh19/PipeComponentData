# PipeComponentData

Source-backed piping component data and adapter APIs for pipe, valve, flange, fitting, gasket, support, reducer, olet, UXML, CEG, PipeData, Solid3D, DXF, and analysis workflows.

This repository is an engineering-data foundation, not a finished production catalogue. The core rule is strict: **do not fabricate engineering dimensions, weights, ratings, schedules, gasket data, or support values**. Missing source values stay `null`, `UNAVAILABLE`, or `MISSING_DIMENSION`; they are never converted to `0` or nearest available values.

## Current status

The repository currently contains:

| Area | Status |
|---|---|
| Adapter/API phases | Implemented and gated through Phase 13 |
| DB phases | Implemented and gated through DB Phase 15 |
| Studio UI | Static GitHub Pages Studio with exact-search, source audit, and coverage view |
| CI | Node 20 and Node 22 gate matrix |
| Pages deployment | Publishes Studio and minimal JSON assets only |
| Full production data coverage | Not complete; coverage dashboard exposes current gaps |

## Implemented adapter/API gates

The adapter/API gate chain currently covers:

1. Adapter graph contract
2. State slice
3. Raw/CSV/UXML input handling
4. PipeData seed enrichment
5. Connectivity
6. UXML roundtrip
7. CEG bridge
8. Simplified/weight bridge
9. Solid3D specs
10. DXF sidecar
11. UI workbench model
12. Full adapter cumulative gate

Run the current cumulative adapter/API gate with:

```bash
npm run gate:phase13
```

## Implemented DB gates

The DB gate chain currently covers:

1. DB contract/schema freeze
2. Raw inventory manifest
3. Parser policies
4. Source parser staging layer
5. Normalization envelope foundation
6. Pipe schedule catalogue foundation
7. Flange catalogue foundation
8. Valve catalogue foundation
9. BW fitting catalogue foundation
10. Gasket availability / non-fabrication gate
11. Support/span foundation
12. Exact alias search foundation
13. Project override foundation
14. Export/audit pack foundation
15. Coverage dashboard
16. Index/catalog alignment

Run the current cumulative DB gate with:

```bash
npm run db:test
```

## Studio UI

The Studio UI lives under:

```txt
studio/
```

It provides:

- category selector for component families
- strict exact-search workflow
- no-fallback/no-fabrication messaging
- result cards and no-match state
- normalized data table
- CAD/SVG-style preview shell
- separate Source Audit panel
- read-only DB coverage dashboard
- verification footer

Serve locally:

```bash
cd studio
python -m http.server 8000
```

Then open:

```txt
http://localhost:8000
```

## Commands

Install dependencies:

```bash
npm install
```

Run all gates:

```bash
npm test
```

Run only adapter/API gates:

```bash
npm run gate:phase13
```

Run only DB gates:

```bash
npm run db:test
```

Run only Studio UI gate:

```bash
npm run ui:gate
```

## Exact-match policy

Search and lookup behavior must remain exact and source-backed.

Allowed:

- exact ID match
- exact alias match
- complete exact structured-filter match
- explicit project override with provenance

Not allowed:

- nearest NPS fallback
- nearest rating fallback
- nearest schedule fallback
- fuzzy engineering dimension match
- fabricated gasket dimensions
- fabricated support dimensions
- converting missing source values to `0`

## Data and provenance policy

Every normalized row must preserve enough source context to support auditability. Required provenance includes at least:

- source family / source file reference
- dataset version
- data status
- basis for values where available
- unavailable or missing values marked explicitly

Normal Studio workflow must not expose the raw source tree. Raw source details belong in Source Audit mode.

## GitHub Pages deployment

The Pages workflow publishes only the static Studio and required minimal JSON assets, including:

```txt
studio/
data/indexes/component-search.index.json
data/search/component-aliases.json
data/normalized/*.json
data/audit/db-coverage-dashboard.json
```

The raw source database tree under `docs/Pipedata/Database` must not be published to Pages unless explicitly approved.

## Coverage dashboard

The DB coverage dashboard is generated as audit data at:

```txt
data/audit/db-coverage-dashboard.json
```

It reports:

- source family coverage
- normalized row coverage
- READY / PARTIAL / MISSING_DIMENSION status counts
- unavailable field counts
- index/catalog alignment gaps

Coverage reporting does not promote or invent values.

## Known limitations

- The normalized database still contains foundation and representative rows, not full production coverage.
- Gasket rows remain inventory/availability-level where proper size/class source data is unavailable.
- Support/span data remains limited to source-backed placeholders/foundation logic.
- The Studio is a static UI, not a full CAD editor.
- Viewer/converter integration should wait until the public API surface is intentionally frozen.

## Recommended next work

1. Keep CI and Pages green after each merge.
2. Expand normalized datasets family by family using only committed source-backed data.
3. Add gates for every data expansion.
4. Freeze the public lookup API before wiring GLB-PCF or 3D Viewer integrations.
5. Add browser smoke / visual integrity testing for the Studio.
6. Tag a first foundation release after documentation, API, and Pages behavior stabilize.
