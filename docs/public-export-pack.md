# Public export pack contract

The public export pack is the machine-readable contract for downstream applications such as GLB-PCF editors, 3D viewers, and converter tools.

## Manifest

```txt
/data/exports/public-export-pack.manifest.json
```

The manifest lists only approved public artifacts and stable public API symbols. It is intentionally separate from the raw source database tree.

## Safety policy

Consumers must treat the manifest policy as mandatory:

```txt
exactMatchOnly: true
noEngineeringFallback: true
rawSourceTreePublished: false
missingValues: null_or_UNAVAILABLE
provenanceRequired: true
```

No downstream app should infer nearest NPS, nearest rating, nearest schedule, gasket dimensions, support dimensions, weights, or fallback values from this package.

## Stable API symbols

```js
import { lookupComponentExact, LOOKUP_STATUS } from 'pipe-component-data';
```

Use `lookupComponentExact()` for source-backed exact component lookup. Treat `LOOKUP_STATUS.NO_EXACT_MATCH` and `LOOKUP_STATUS.CATALOG_ROW_MISSING` as stop states, not as permission to estimate.

## Public JSON artifacts

The public manifest currently approves only these families of artifacts:

```txt
data/exports/*.json
data/indexes/component-search.index.json
data/search/component-aliases.json
data/audit/db-coverage-dashboard.json
data/normalized/*.json
```

The raw source tree remains excluded:

```txt
docs/Pipedata/Database
```

## Pages deployment

GitHub Pages publishes the Studio and the approved public artifacts only. It must not publish `docs/Pipedata/Database` unless the repository owner explicitly approves a future policy change.
