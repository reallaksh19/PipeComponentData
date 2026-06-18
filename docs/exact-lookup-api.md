# Exact lookup API

Use `lookupComponentExact()` for downstream integrations such as GLB-PCF, 3D Viewer, converters, or neutral-file exporters.

Do not depend directly on internal search-ranking helpers for engineering lookup. The public facade returns normalized rows only when the request is exact and source-backed.

## Contract

`lookupComponentExact(query, assets, options)` accepts:

- `query`: exact ID, exact alias, or exact canonical text.
- `assets.searchIndex`: `data/indexes/component-search.index.json`.
- `assets.aliases`: `data/search/component-aliases.json` or its `rows` array.
- `assets.catalogs`: object or `Map` keyed by normalized catalog path, for example `data/normalized/valves.json`.
- `options.filters`: optional exact structured filters.

The function returns one of these statuses:

- `FOUND`
- `NO_EXACT_MATCH`
- `CATALOG_ROW_MISSING`
- `INVALID_ASSETS`

## Example

```js
import { lookupComponentExact } from 'pipe-component-data';

const result = lookupComponentExact('GATE VALVE 8 150 RF', {
  searchIndex,
  aliases,
  catalogs: {
    'data/normalized/valves.json': valves,
  },
}, {
  filters: {
    componentType: 'VALVE',
    valveType: 'GATE',
    nps: '8',
    classRating: '150',
    facing: 'RF',
  },
});

if (result.ok) {
  console.log(result.row);
  console.log(result.provenance);
}
```

## No-fallback rule

The facade does not perform:

- nearest NPS fallback
- nearest rating fallback
- nearest schedule fallback
- nearest family/subtype fallback
- fabricated dimension or weight lookup

Wrong NPS/rating/schedule requests return `NO_EXACT_MATCH`. If a search-index entry exists but its normalized row is not loaded, the API returns `CATALOG_ROW_MISSING` instead of inventing a row.
