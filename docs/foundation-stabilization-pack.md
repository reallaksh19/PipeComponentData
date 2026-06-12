# Foundation Stabilization Pack

This document covers DB32 through DB36. The pack is metadata and gate oriented. It does not promote new engineering dimensions, weights, schedules, ratings, gasket values, support values, reducer rows, or olet rows.

## DB32 - Dataset version manifest

`data/audit/dataset-version-manifest.json` records the foundation dataset version, catalog coverage level, public indexes, and audit evidence.

## DB33 - Exact lookup fixture matrix

`data/exports/exact-lookup-fixtures.json` provides stable smoke cases for downstream consumers of `lookupComponentExact()`.

The matrix includes positive cases for pipe, flange, valve, fitting, and gasket inventory status, plus a negative wrong-rating no-fallback case.

## DB34 - Downstream consumer contract

`data/exports/downstream-consumer-contract.json` records the public integration rules for GLB-PCF, 3D Viewer, and other downstream apps.

Consumers must use public API symbols and public JSON artifacts. They must not read the raw source tree or infer unavailable engineering values.

## DB35 - Pages artifact contract

`data/audit/pages-artifact-contract.json` records the minimal public artifact contract for GitHub Pages. The raw source database tree remains forbidden.

## DB36 - Foundation tag readiness

`data/audit/foundation-tag-readiness.json` records the evidence required before tagging `v0.1.0-foundation`.

The tag represents a source-backed foundation release only. It is not a production-complete catalog.
