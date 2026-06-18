# Source Expansion Wave 4 Promotion

This pack promotes bounded source-backed addendum catalogs after the DB52-DB54 readiness gates.

## DB55 — Pipe SCH80 wave 2 promotion

Adds `data/normalized/pipes-sch80-wave2.json` with exact source-backed Schedule 80 rows from `docs/Pipedata/Database/Pipe/PIPE80.csv`:

- NPS 8
- NPS 10
- NPS 12

The existing wave-1 pipe catalog remains unchanged. The component search index points the new exact rows to the addendum catalog.

## DB56 — Flange Class 600 wave 2 promotion

Adds `data/normalized/flanges-cl600-wave2.json` with exact source-backed Class 600 rows from `docs/Pipedata/Database/Flan/Flg600.csv`:

- WN / SO / BLIND
- NPS 2 / 4 / 6

Blind flange hub/weld fields remain `null` / `UNAVAILABLE`; they are not inferred.

## DB57 — Reducer remains blocked

Reducer promotion remains blocked until large/small-end source columns are proven and no single-NPS reducer rows are possible.

## Safety

- Exact-match only.
- No nearest NPS, schedule, class, family, subtype, or reducer fallback.
- No fabricated engineering values.
- Raw source database tree remains excluded from Pages.
