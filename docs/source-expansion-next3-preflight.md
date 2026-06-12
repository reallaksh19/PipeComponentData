# Source Expansion Next-3 Preflight

This document records the next three source-backed DB phases after the DB47-DB50 wave-1 expansion.

## Scope

| Phase | Family | Purpose | Promotion status |
|---|---|---|---|
| DB42 | PIPE | Full schedule expansion preflight | Not promoted |
| DB43 | FLANGE | Additional class expansion preflight | Not promoted |
| DB44 | VALVE | Additional valve type expansion preflight | Not promoted |

## Rules

- Promote only from committed source files.
- Do not infer missing engineering values.
- Do not use nearest size, class, schedule, family, or valve-type fallback.
- Keep missing values as `null` or `UNAVAILABLE`.
- Keep raw source DB hidden from normal Studio and Pages.

## DB42 Pipe

DB42 verifies that the current pipe catalog remains the DB47 wave-1 boundary and that source evidence is committed before any full schedule expansion is attempted.

Current promoted schedules remain Schedule 40 and Schedule 80 only.

## DB43 Flange

DB43 verifies committed source files for candidate Classes 400, 600, 900, 1500, and 2500 without promoting those rows yet.

Current promoted flange classes remain Class 150 and Class 300 only.

## DB44 Valve

DB44 verifies committed valve source and set-file evidence for future valve type mapping review without promoting new valve types yet.

Current promoted valve type remains flanged RF gate valve only.
