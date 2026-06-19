# Wave 13B — DB index dashboard binding

## Scope

Wave 13B makes the PipeSpec DB dashboard and table use the master DB index added in Wave 13A.

## Included

- Load `pipetools/data/db-index.json` before loading component rows.
- Render the top component dashboard from `db-index.json` families instead of hardcoded lists.
- Lazy-load the selected normalized DB family when the user clicks Pipe, Valve, Flange, Fitting, Gasket, or Support.
- Generate subtype cards from the selected index family.
- Generate filter strips from the selected index family's `availableFilters` and loaded row values.
- Generate table columns from the selected index family's `keyFields`.

## Out of scope

- No SVG engine integration in this wave.
- No raw source DB tree publication.
- No full DB promotion beyond existing normalized DB files.

## Next

Wave 13C should vendor the uploaded PipeSpec SVG engine and add a thin adapter around the current normalized row shape.
