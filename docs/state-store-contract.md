# State Store Contract

Core is store-neutral.

Apps may wrap the core using zustand, reducers, or pub-sub stores. Core exposes plain graph data, pure mutations, and selectors only.

Rules:

1. Graph mutations are pure `(graph, args) => newGraph`.
2. Core must not import zustand.
3. Core must not store Three.js meshes, XML strings, DXF strings, or derived Solid3D specs inside AdapterGraph.
4. Zustand slice factories accept app-owned `set` and `get`; they must not import or create a zustand store.
5. Undo/redo must wrap pure mutations, not hidden mutable state.
