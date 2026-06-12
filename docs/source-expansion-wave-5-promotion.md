# Source Expansion Wave 5 Promotion

Wave 5 extends the addendum-based source promotion model without rewriting earlier wave catalogs.

## DB58 — Pipe SCH80 wave 3 promotion

Promotes bounded SCH80 pipe rows from `docs/Pipedata/Database/Pipe/PIPE80.csv`:

- `PIPE|NPS14|SCH80`
- `PIPE|NPS16|SCH80`
- `PIPE|NPS18|SCH80`

## DB59 — Flange CL600 wave 3 promotion

Promotes bounded Class 600 flange rows from `docs/Pipedata/Database/Flan/Flg600.csv`:

- WN / SO / BLIND
- NPS 8 / 10

Blind flange hub/weld fields remain `null` / `UNAVAILABLE`.

## DB60 — Blocked families remain blocked

No reducer, olet, gasket-dimension, or support-span promotion is included in this wave.

## Safety rules

- No fabricated engineering values.
- No nearest-size, nearest-schedule, nearest-class, family, or subtype fallback.
- Existing wave-1 and wave-2 catalogs remain stable.
- Raw source DB remains excluded from Pages.
