# PipeComponentData

Shared, gate-driven piping adapter and component-data package.

## Current phase

Phase 0/1 scaffold is implemented:

- UXML-shaped `AdapterGraph` contract.
- Exact top-level key gate.
- JSON serializability gate.
- Contract checksum gate.
- Public API surface lock placeholder.
- No module may exceed 200 lines.

## Run

```bash
npm run gate:phase1
npm run check:line-count
```

## Design rule

`AdapterGraph` is the cross-repo exchange object. It follows the UXML object model and remains plain JSON. Renderers, stores, DXF, CEG, and Simplified outputs are projections.
