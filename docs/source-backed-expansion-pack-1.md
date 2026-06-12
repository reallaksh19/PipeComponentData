# Source-backed Expansion Pack 1

This pack promotes a limited set of source-backed rows for pipe schedules and flanges.

## Pipe schedules

Promoted rows are from `docs/Pipedata/Database/Pipe/PIPE40.csv`.

The pack adds Schedule 40 samples for NPS 0+1/4, 1, and 2 while retaining the existing NPS 0+1/8 partial row and NPS 4 ready row.

## Flanges

Promoted rows are from `docs/Pipedata/Database/Flan/Flg300.csv`.

The pack adds Class 300 WN/SO/BLIND samples for NPS 2 and NPS 6 and keeps the existing NPS 4 Class 300 rows.

## Safety rules

- No generated engineering dimensions.
- No fallback to nearest size, rating, schedule, family, or subtype.
- Every promoted numeric value must carry `SOURCE_VALUE`.
- Missing source values remain `null` and `UNAVAILABLE`.
- Full production coverage remains incomplete.
