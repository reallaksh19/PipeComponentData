# DXF-Based Piping Symbol Library

This folder is the static-first DXF/SVG symbol library for `PipeComponentData`.

The visible symbols are the converted SVG files produced from the uploaded DXF symbol package. They are not hand-drawn JavaScript approximations and must not be replaced by generic fallback icons. When a component cannot be resolved, the UI/API must return `SVG_NOT_AVAILABLE`.

## Folder layout

```text
pipetools/symbols/dxf/
  index.html                    Standalone static viewer
  dxf-symbol-manifest.json       Source-of-truth manifest
  dxf-symbol-manifest.js         file:// fallback manifest for local preview
  symbol-audit.json              Batch coverage / QA audit
  js/symbol-library.js           Viewer, DB hydration, and resolver
  symbols/*.svg                  DXF-derived SVG files
```

## Current batch

The first production batch maps 28 representative DXF-derived SVGs:

- Pipe: `Pipe1`
- Gaskets: `Gflt1`, `Gspr1`, `Grtj1`
- Flanges: `Flan1`, `Flan2`, `Flan3`, `FLAP1`
- Valves: `Vlfl1` to `Vlfl7`
- BW fittings/reducers: `Ftbw1`, `Ftbw2`, `Ftbw6`, `Ftbw7`, `Ftbw8`, `Ftbw9`, `Ftbw10`
- Olets: `Wbol1`, `Wbol2`, `Wbol4`, `Wbol7`
- Extra fitting/line item: `Ftsc3`, `Blnu1`

## Manifest contract

Each symbol entry includes:

```json
{
  "id": "VALVE_GATE_FLANGED",
  "sourceCode": "Vlfl1",
  "sourceDxf": "vlfl1.dxf",
  "svg": "symbols/vlfl1.svg",
  "title": "Flanged Gate Valve",
  "family": "VALVE",
  "componentType": "VALVE",
  "subtype": "GATE",
  "endType": "FLANGED",
  "standard": "ASME B16.10",
  "quality": "DXF_DERIVED",
  "dbLookup": {
    "componentType": "VALVE",
    "valveType": "GATE",
    "endType": "FLANGED"
  }
}
```

`dbLookup` contains the normalized row fields used by `resolveSymbolForComponent(row)`. Keep it specific enough to avoid wrong symbol fallback.

## Running locally

Open `index.html` directly or serve the repository root with any static server:

```bash
python -m http.server 8080
```

Then browse to:

```text
http://localhost:8080/pipetools/symbols/dxf/index.html
```

When opened via `file://`, browser security may block `fetch()` for `dxf-symbol-manifest.json`; the page falls back to `dxf-symbol-manifest.js`.

## Adding more DXF-derived SVGs

1. Convert the DXF file to SVG without redrawing or simplifying the geometry.
2. Place the SVG under `pipetools/symbols/dxf/symbols/`.
3. Add one manifest entry with `sourceCode`, `sourceDxf`, `svg`, `title`, `family`, `componentType`, subtype/end/facing fields, `standard`, `quality`, and `dbLookup`.
4. Regenerate or update `dxf-symbol-manifest.js` so local `file://` fallback remains identical to the JSON manifest.
5. Update `symbol-audit.json`.
6. Verify the symbol card, search result, family filter, detail panel, and resolver output.

## QA checklist

- Every manifest entry points to a real SVG file.
- Every SVG loads in the card and detail panel.
- Search works for code, title, subtype, family, and standard.
- Family dashboard filters correctly.
- `resolveSymbolForComponent(row)` returns the correct symbol for supported DB rows.
- Unsupported rows return `SVG_NOT_AVAILABLE`.
- No component falls back to a wrong generic symbol.
- Optional DB hydration from `pipetools/data/db-index.json` does not block offline/static viewing.
