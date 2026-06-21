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

Anchors are intentionally geometry-only. Display values are injected from the selected normalized DB row at runtime.

## Supported anchor kinds

### `diameter`

Use `diameter` when the source SVG visibly represents a circular outside diameter, bore, bolt circle, or similar diameter-style engineering fact.

```json
{
  "kind": "diameter",
  "p1": [205, 360],
  "p2": [795, 360],
  "labelAt": [500, 116],
  "preferredValueKeys": ["OD", "Outer Dia", "odMm", "dimensions.odMm"]
}
```

The renderer draws a diameter dimension line between `p1` and `p2` and places the label at `labelAt`.

### `leader`

Use `leader` when the fact points to a local feature, such as wall thickness, gasket thickness, flange plate thickness, or raised face height.

```json
{
  "kind": "leader",
  "from": [760, 354],
  "to": [858, 228],
  "labelAt": [872, 228],
  "preferredValueKeys": ["Thickness", "Thk", "Wall / Thk", "dimensions.thicknessMm"]
}
```

`from` is the target feature on the SVG geometry. `to` is the leader tail near the label. The arrowhead points at `from`.

### `badge`

Use `badge` for source-backed facts that should not imply a measured line on the drawing, such as weight, bolt summary, provenance/status facts, or optional handle/paddle values.

```json
{
  "kind": "badge",
  "labelAt": [760, 562],
  "preferredValueKeys": ["Weight", "Weight / m", "weights.kg"]
}
```

A badge has no leader or dimension arrow unless a future schema explicitly adds one. Weights should normally be badges, not arrows or dimension lines.

## Phase 2 gasket and flange examples

The Phase 2 anchors cover the ring/plate-style DXF symbols first because their annotation geometry is simple and visually stable:

- `Gflt1`, `Gspr1`, `Grtj1`: gasket OD, ID, thickness, and weight badge.
- `Flan1`, `Flan2`, `Flan3`, `FLAP1`: flange OD/PCD, bore where visible, local leaders for thickness/RF, and badges for bolts/weight.
- `Blnu1`: line-blank OD, thickness, optional paddle/handle badge, and weight badge.

Use `diameter` for visible round geometry, `leader` for a short pointer to a local edge or raised feature, and `badge` when a fact should be displayed without implying measured drawing geometry.

## Geometry-only rule

Anchors define semantic geometry only. Runtime engineering values are injected from the selected normalized DB row through the existing dimension fact/formatting helpers.

Never hardcode DB values in anchor JSON. Do not include values such as pipe wall thickness, outside diameter, inside diameter, weight, tolerance, rating-derived dimensions, or sample strings like numeric dimension text.

## Add a new sourceCode anchor

1. Confirm the source code exists in `pipetools/symbols/dxf/dxf-symbol-manifest.json`.
2. Create `pipetools/symbols/dxf/anchors/<sourceCode>.json`.
3. Use the normalized SVG viewBox coordinate system for all points.
4. Add anchors only for facts that are semantically visible in the source SVG.
5. Use stable labels and `preferredValueKeys` that map to existing DB fact labels or paths.
6. Run validation, anchor coverage audit, and the PipeTools DXF tests.
7. Visually inspect the symbol in `pipetools/index.html` using Full, Compact, and Off callout modes.

## Validation and coverage audit

Run:

```sh
node pipetools/symbols/dxf/validate-symbol-anchors.mjs
node pipetools/symbols/dxf/audit-symbol-anchor-coverage.mjs --check
```

`validate-symbol-anchors.mjs` fails on invalid schema, unsupported geometry kinds, malformed coordinates, unknown manifest sourceCodes, placeholder values, or hardcoded dimension/weight strings.

`audit-symbol-anchor-coverage.mjs --check` validates all committed anchor files and reports incremental coverage. It does not fail just because many manifest symbols do not yet have anchors.

Recommended full PipeTools verification:

```sh
node pipetools/data/sync-db-index.mjs
node pipetools/symbols/dxf/validate-dxf-symbols.mjs
node pipetools/symbols/dxf/validate-dxf-offsets.mjs
node pipetools/symbols/dxf/validate-symbol-anchors.mjs
node pipetools/symbols/dxf/audit-symbol-anchor-coverage.mjs --check
node pipetools/symbols/dxf/audit-dxf-callout-coverage.mjs --check
node --test tests/pipetools-dxf-behavior.test.mjs
node --test tests/pipetools-symbol-anchor-expansion.test.mjs
npm test
```

## Visual inspection

Open `pipetools/index.html`, select rows that resolve to the target `sourceCode`, and verify that callouts attach to the intended source geometry without duplicate labels or placeholder values.

For Phase 2 QC:

- Pipe1: OD/ID remain diameter callouts, Wall/Thk remains a leader, and Weight/m remains a badge.
- Gaskets: OD/ID display only when DB-backed, thickness uses a short leader, and weight is a badge.
- Flanges: OD/Bore/Thickness/RF/PCD/Bolts/Weight display only when DB-backed, and weight is a badge.
- Line blank: OD and thickness display only when DB-backed; handle/paddle facts display only if the selected DB row exposes a source-backed field.
- Unanchored valves/fittings: the existing template fallback still works.
