# PipeTools DXF symbol anchors

Manual anchor JSON files provide sourceCode-specific semantic geometry for DXF/SVG dimension callouts. They are used when a converted SVG needs callout placement that a family-level template cannot know safely, such as the Pipe1 wall-thickness leader attaching to the pipe wall.

## Runtime priority

PipeTools resolves callouts in this order:

1. Use a valid manual anchor JSON for the selected `sourceCode`.
2. Fall back to the existing family/source callout template and collision-aware layout.
3. Skip any callout whose DB-backed value is missing.

Anchor support must never render placeholder values such as `—`, `-`, `null`, `undefined`, or empty labels.

## Schema

Each anchor file is named after its DXF `sourceCode`:

```text
pipetools/symbols/dxf/anchors/<sourceCode>.json
```

Top-level fields:

- `version`: must be `PipeToolsSymbolAnchor.v1`.
- `sourceCode`: must match the filename and a sourceCode in `../dxf-symbol-manifest.json`.
- `viewBox`: `[x, y, width, height]` for the normalized anchor drawing coordinate system.
- `units`: normally `normalized-svg`.
- `description`: human-readable review note.
- `anchors`: object keyed by stable callout label, for example `OD`, `ID`, `Wall / Thk`, `Weight / m`.

## Supported anchor kinds

### `diameter`

Uses:

```json
{
  "kind": "diameter",
  "p1": [265, 350],
  "p2": [555, 350],
  "labelAt": [410, 133],
  "preferredValueKeys": ["OD", "odMm", "dimensions.odMm"]
}
```

The renderer draws a diameter dimension line between `p1` and `p2` and places the label at `labelAt`.

### `leader`

Uses:

```json
{
  "kind": "leader",
  "from": [485, 275],
  "to": [745, 137],
  "labelAt": [760, 137]
}
```

`from` is the target feature on the SVG geometry. `to` is the leader tail near the label. The arrowhead points at `from`.

### `badge`

Uses:

```json
{
  "kind": "badge",
  "labelAt": [753, 537]
}
```

A badge has no leader or dimension arrow unless a future schema explicitly adds one.

## Geometry-only rule

Anchors define semantic geometry only. Runtime engineering values are injected from the selected normalized DB row through the existing dimension fact/formatting helpers.

Never hardcode DB values in anchor JSON. Do not include values such as pipe wall thickness, outside diameter, inside diameter, weight, tolerance, rating-derived dimensions, or sample strings like `17.1 mm`.

## Add a new sourceCode anchor

1. Confirm the source code exists in `pipetools/symbols/dxf/dxf-symbol-manifest.json`.
2. Create `pipetools/symbols/dxf/anchors/<sourceCode>.json`.
3. Use the normalized SVG viewBox coordinate system for all points.
4. Add anchors only for facts that are semantically visible in the source SVG.
5. Use stable labels and `preferredValueKeys` that map to existing DB fact labels or paths.
6. Run validation and the PipeTools DXF tests.
7. Visually inspect the symbol in `pipetools/index.html` using Full, Compact, and Off callout modes.

## Validation

Run:

```sh
node pipetools/symbols/dxf/validate-symbol-anchors.mjs
```

Recommended full PipeTools verification:

```sh
node pipetools/data/sync-db-index.mjs
node pipetools/symbols/dxf/validate-dxf-symbols.mjs
node pipetools/symbols/dxf/validate-dxf-offsets.mjs
node pipetools/symbols/dxf/validate-symbol-anchors.mjs
node pipetools/symbols/dxf/audit-dxf-callout-coverage.mjs --check
node --test tests/pipetools-dxf-behavior.test.mjs
npm test
```

## Visual inspection

Open `pipetools/index.html`, select a row that resolves to the target `sourceCode`, and verify that the callouts attach to the intended source geometry without duplicate labels or placeholder values.
