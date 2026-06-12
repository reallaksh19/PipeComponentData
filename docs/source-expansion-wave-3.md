# Source Expansion Wave 3 Readiness

This pack adds DB52-DB54 promotion-readiness gates after the DB45/DB46/DB51 source-matrix work.

## DB52 — Pipe SCH80 wave 2 readiness

Locks bounded Schedule 80 candidates for NPS 8, 10, and 12 from `docs/Pipedata/Database/Pipe/PIPE80.csv`.

No normalized pipe rows are promoted in this PR.

## DB53 — Flange Class 600 wave 2 readiness

Locks bounded Class 600 WN/SO/BLIND candidates for NPS 2, 4, and 6 from `docs/Pipedata/Database/Flan/Flg600.csv`.

No normalized Class 600 flange rows are promoted in this PR.

## DB54 — Reducer source-column map

Keeps reducer promotion blocked until large/small end identity, schedule/thickness basis, end-to-end length, reducer type, and weight columns are all verified.

No reducer rows are normalized or indexed in this PR.

## Safety

- Exact-match only.
- No nearest size, class, schedule, or reducer fallback.
- No fabricated engineering values.
- Raw source DB remains excluded from Pages.
