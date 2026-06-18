# PipeComponentData Data Governance

PipeComponentData is source-backed. The project must preserve traceability and must not fabricate engineering values.

## Current governance status

Source-use rights for the full raw database tree still require owner verification before any broader publication decision. Until that verification is complete, the raw source tree remains excluded from the GitHub Pages artifact and hidden from the normal Studio workflow.

The machine-readable policy is maintained at:

```txt
 data/audit/source-use-policy.json
```

## Raw source tree policy

The raw source tree is:

```txt
 docs/Pipedata/Database
```

Rules:

- Do not publish the raw source database tree through GitHub Pages.
- Do not expose the raw source tree in the normal Studio workflow.
- Keep raw source details inside explicit Source Audit or repository review contexts only.
- Require owner approval before adding new third-party or vendor source tables.

## Public artifact policy

The public/static Studio artifact may publish only the minimal approved JSON files listed in:

```txt
 data/exports/public-export-pack.manifest.json
```

This includes normalized/source-backed rows, indexes, aliases, audit summaries, and export manifests. It does not include the raw source database tree.

## Engineering data rules

- No fabricated dimensions, weights, schedules, ratings, gasket values, support values, bore values, or CAD values.
- Missing source values remain `null` or `UNAVAILABLE`.
- Exact match only unless an explicit project override exists and provenance is recorded.
- No nearest-size, nearest-rating, nearest-schedule, or fuzzy engineering fallback.
- Every normalized row must preserve source provenance.

## Source promotion checklist

Before promoting new source rows into normalized data:

1. Confirm source-use rights and publication scope.
2. Preserve source path, source row, source token, standard, and dataset version where available.
3. Keep missing values as `null` / `UNAVAILABLE`.
4. Add or update family-specific gates.
5. Update coverage dashboard/audit outputs.
6. Confirm GitHub Pages still excludes `docs/Pipedata/Database`.

## Release implication

A release tag should not imply complete production database coverage. Until full family expansion and source-use verification are complete, releases should be described as source-backed foundation releases, not complete engineering catalog releases.
