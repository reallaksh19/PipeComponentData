# Source Expansion Wave 2 Preflight

This pack adds the next safe expansion wave after DB42-DB44 and wave-1 promotion.

## DB45 — Pipe schedule source matrix

Locks the committed `PIPE40.csv` and `PIPE80.csv` source-row matrix for future bounded promotion. This is still preflight-only: no new pipe rows are promoted in this PR.

## DB46 — Flange higher-class source matrix

Locks higher-class flange source candidates and marks Class 600 as ready for a bounded WN/SO/BLIND sample promotion in a later PR. This PR does not promote Class 600 rows.

## DB51 — Reducer canonical schema readiness

Adds a reducer schema requiring two-size identity: large NPS, small NPS, large schedule, small schedule, and reducer type. This prevents reducers from being incorrectly promoted as single-NPS fitting rows.

## Safety

- No fabricated engineering values.
- No nearest size, class, schedule, or reducer fallback.
- No normalized reducer rows yet.
- No Class 600 flange promotion yet.
- No full pipe schedule bulk promotion yet.
- Source provenance remains mandatory.
