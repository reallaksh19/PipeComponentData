# PipeComponentData Release Readiness

PipeComponentData is ready to be described as a **source-backed foundation release** after the release-readiness and integration-contract gates pass.

It must not be described as a production-complete engineering catalog yet.

## Machine-readable status

```txt
 data/audit/release-readiness.json
```

Current release class:

```txt
 SOURCE_BACKED_FOUNDATION
```

Current status:

```txt
 FOUNDATION_READY
```

## What this means

The repository has gated adapter/API, DB, UI smoke, public export-pack, governance, and TypeScript declaration coverage. The public API surface is stable enough for controlled downstream integration through `lookupComponentExact()`.

## What this does not mean

This does not mean the normalized database is complete. Family expansion remains pending for broader pipe schedules, flange classes, valve types, BW/SW/SC fittings, reducers, olets, gasket dimensions, and support/span logic.

## Release wording

Allowed wording:

```txt
 source-backed foundation release
```

Blocked wording:

```txt
 production-complete engineering catalog
```

## Release safety rules

- Exact match only.
- No nearest-size, nearest-rating, nearest-schedule, or fuzzy engineering fallback.
- No fabricated dimensions, weights, schedules, ratings, gasket values, support values, or CAD values.
- Missing source values remain `null` or `UNAVAILABLE`.
- Source provenance remains mandatory.
- Raw `docs/Pipedata/Database` stays excluded from GitHub Pages.
- Source-use rights need owner verification before broader raw-source publication.
