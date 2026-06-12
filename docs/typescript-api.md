# TypeScript API declarations

PipeComponentData publishes a no-build TypeScript declaration file for the package entrypoint:

```txt
src/index.d.ts
```

The package advertises it through:

```json
{
  "types": "./src/index.d.ts"
}
```

## Stable exact lookup contract

Downstream applications should prefer the stable exact lookup facade instead of importing internal search helpers:

```ts
import { lookupComponentExact, LOOKUP_STATUS } from 'pipe-component-data';

const result = lookupComponentExact('GATE VALVE 8 150 RF', assets);

if (result.status === LOOKUP_STATUS.FOUND) {
  console.log(result.row.id);
}
```

`NO_EXACT_MATCH`, `CATALOG_ROW_MISSING`, and `INVALID_ASSETS` are stop states. They do not permit nearest-size, nearest-rating, nearest-schedule, gasket-dimension, support-dimension, or weight fallback.

## Scope

The declaration file exposes the locked package entrypoint symbols and gives stronger types to the exact lookup API. Older adapter exports are declared conservatively with `unknown` arguments/returns until their public contracts are intentionally frozen.

## Safety policy

The declarations do not expose `componentSearch()` or `SEARCH_MODE` as stable public API. Downstream apps should use `lookupComponentExact()` plus the public export-pack manifest.
