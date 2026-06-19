# Source Expansion Wave 6 Promotion

Wave 6 extends the addendum-based promotion model with the first reducer wave.

## DB64 -- Reducer SCH80 wave 1 promotion

Promotes bounded schedule 80 reducer rows from `docs/Pipedata/Database/Ftbw/Reducers80.csv`:

- `REDUCER|UNKNOWN|NPS0+3/4|NPS0+1/2|SCH80`
- `REDUCER|UNKNOWN|NPS1|NPS0+3/4|SCH80`
- `REDUCER|UNKNOWN|NPS1+1/4|NPS0+1/2|SCH80`
- `REDUCER|UNKNOWN|NPS1+1/2|NPS1+1/4|SCH80`
- `REDUCER|UNKNOWN|NPS2|NPS1+1/2|SCH80`
- `REDUCER|UNKNOWN|NPS2+1/2|NPS2|SCH80`

The reducer table uses explicit matrix row/column cells. Length is taken from the `Length H` column and weight from the `KG` column.

## DB65 -- Reducer exact lookup

Adds exact lookup coverage for the promoted reducer rows and keeps wrong schedule, wrong type, and wrong family queries at `NO_EXACT_MATCH`.

## DB66 -- Blocked families proof

OLET remains blocked, and gasket/support remain in their current non-promoted states.

## Safety rules

- No fabricated engineering values.
- No nearest-size, nearest-schedule, nearest-class, family, subtype, or reducer fallback.
- Existing wave catalogs remain stable.
- Raw source DB remains excluded from Pages.
