# Wave 13A — DB Index Import

## Scope

Wave 13A introduces a single PipeTools DB master index without rebinding the dashboard yet.

## Added

- `pipetools/data/db-index.json`
- `pipetools/js/db/dbIndex.js`
- `data/audit/pipetools-agent-16-db-index-manifest.json`
- `gates/pipetools-agent-16-db-index.gate.test.js`

## Indexed families

| Family | Normalized DB | SVG flag | Notes |
| --- | --- | --- | --- |
| PIPE | `data/normalized/pipes.json` | true | Pipe schedule source-backed sample rows. |
| VALVE | `data/normalized/valves.json` | true | Gate valve rows promoted; other valve subtypes reserved for expansion. |
| FLANGE | `data/normalized/flanges.json` | true | WN/SO/BLIND rows exploded from flange source tables. |
| FITTING | `data/normalized/fittings.json` | true | ELBOW_90, ELBOW_45, TEE_STRAIGHT, CAP. |
| GASKET | `data/normalized/gaskets.json` | true | Inventory selector rows only; numeric dimensions deferred. |
| SUPPORT | `data/normalized/supports.json` | false | Indexed for dashboard visibility; SVG deferred. |

## Out of scope

- No dashboard rebinding in this wave.
- No SVG engine integration in this wave.
- No raw `docs/Pipedata/Database` publication to Pages.

## Next wave

Wave 13B should use this index to drive the PipeSpec dashboard and table source selection.
