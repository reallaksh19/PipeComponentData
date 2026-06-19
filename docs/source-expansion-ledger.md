# Source Expansion Ledger

The source expansion ledger controls family-by-family promotion from committed source data into normalized public catalogs.

## Policy

- Promote only source-backed values.
- Do not fabricate dimensions, weights, schedules, ratings, gasket dimensions, or support values.
- Do not use nearest-size, nearest-rating, nearest-schedule, family, or subtype fallback.
- Missing source values remain `null` or `UNAVAILABLE`.
- No family is production-complete without full coverage evidence and a dedicated gate.

## This pack

This pack promotes a small auditable sample expansion only:

- Pipe Schedule 40 rows from `docs/Pipedata/Database/Pipe/PIPE40.csv`.
- Class 300 WN/SO/BLIND flange rows from `docs/Pipedata/Database/Flan/Flg300.csv`.

Gasket, support, olet, and reducer data remain blocked or manual-review until proper source tables and normalization gates are added.
