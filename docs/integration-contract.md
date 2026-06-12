# Downstream Integration Contract

PipeComponentData exposes a stable foundation contract for downstream viewer and converter apps.

Machine-readable contract:

```txt
 data/exports/integration-contract.manifest.json
```

## Public API

Downstream apps should use:

```js
import { lookupComponentExact, LOOKUP_STATUS } from 'pipe-component-data';
```

Use `lookupComponentExact()` for engineering component lookup.

## Contract rules

- Exact match only.
- Wrong rating, NPS, schedule, subtype, facing, or class returns `NO_EXACT_MATCH`.
- Missing source dimensions remain unavailable.
- Gasket and support placeholder rows must not be treated as complete dimensional data.
- Project overrides require explicit provenance.
- Raw `docs/Pipedata/Database` is not part of the public/static integration contract.

## Public assets

Use only artifacts listed in:

```txt
 data/exports/public-export-pack.manifest.json
 data/exports/integration-contract.manifest.json
```

The contract is intended for GLB-PCF, 3D Viewer, and converter integration after API freeze, without exposing raw source trees or internal helper details.
