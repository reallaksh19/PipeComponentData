# PipeTools SVG native dimension slot bindings

SVG native dimension slot binding is the preferred PipeTools path when a DXF-derived SVG already contains usable dimension scaffolding: green dimension lines, extension lines, leader lines, labels, and value placeholders. In that case, PipeTools should populate the existing SVG text instead of drawing duplicate overlay callout arrows.

This replaces the manual-anchor overlay direction. Manual anchors described new overlay geometry. Slot bindings do not describe geometry. They describe which source-backed DB fact may be written into a sourceCode-specific native SVG text slot.

## Runtime priority

1. If a valid slot binding exists for the selected `sourceCode`, PipeTools tries to populate matching native SVG text slots from source-backed DB facts.
2. Populated facts suppress duplicate generated overlay callouts.
3. Any unpopulated fact may still use the existing template/collision overlay fallback.
4. Missing DB values are not populated and must not render fake values.
5. Placeholder values such as `—`, `-`, `null`, `undefined`, or empty text are never shown as engineering values.

## Schema

```json
{
  "version": "PipeToolsSvgSlotBinding.v1",
  "sourceCode": "Pipe1",
  "strategy": "populate-native-svg-text",
  "description": "Populate native Pipe1 DXF dimension placeholders from source-backed DB facts.",
  "slots": {
    "OD": {
      "labelText": ["Outside Diameter", "OD"],
      "placeholderNear": ["-", "—"],
      "preferredValueKeys": ["OD", "outerDiameterMm", "dimensions.odMm"],
      "format": "diameter-mm",
      "suppressOverlayLabels": ["OD", "Outer Dia"]
    }
  }
}
```

`labelText` identifies source SVG text near the native dimension scaffold. `placeholderNear` limits replacement to a nearby placeholder or unit text when the converted SVG exposes one. If no separate placeholder is present, the runtime may safely append the value to the matched sourceCode-specific label text; it never performs blanket dash replacement.

`preferredValueKeys` links a slot to existing PipeTools DB facts. Displayed values are still formatted through the normal DB dimension fact helpers. Slot JSON must not contain actual dimensions, weights, tolerances, or source facts.

`suppressOverlayLabels` prevents duplicate black overlay callouts when a native SVG slot was populated.

## Supported formats

The validator currently accepts:

- `diameter-mm`
- `mm`
- `kg`
- `kg-per-m`
- `count`
- `text`

The runtime uses existing DB fact formatting; the format value is a schema/documentation guard so future renderers can reason about slot intent without inventing values.

## How placeholders are selected

The populator only considers text nodes selected by the sourceCode-specific slot binding. It first finds a matching label text, then finds the nearest matching `placeholderNear` text. It does not replace every dash in the SVG. If the value is missing, nothing is populated.

Populated nodes receive:

```text
data-pipetools-slot="OD"
data-pipetools-source-backed="true"
```

## Adding a new sourceCode binding

1. Confirm the `sourceCode` exists in `pipetools/symbols/dxf/dxf-symbol-manifest.json`.
2. Inspect the converted SVG and identify stable native text labels/placeholders.
3. Add `pipetools/symbols/dxf/slots/<sourceCode>.json`.
4. Use only semantic labels and DB fact aliases; do not hardcode DB values.
5. Run validation and coverage audit.
6. Visually inspect the symbol in `pipetools/index.html`.

## Validation and tests

```sh
node pipetools/symbols/dxf/validate-svg-slots.mjs
node pipetools/symbols/dxf/audit-svg-slot-coverage.mjs --check
node --test tests/pipetools-svg-slot-binding.test.mjs
```

The coverage audit is incremental. It fails on invalid slot files, unknown sourceCodes, malformed schema, or unsupported formats, but it does not require every manifest symbol to have a slot binding.

## Visual QC checklist

For each bound sourceCode:

- Existing DXF/SVG dimension geometry remains visible.
- Native text slots show DB-backed values only.
- Populated facts do not also draw duplicate overlay callouts.
- Missing DB facts do not show fake text or placeholders.
- Full/Compact/Off still affects overlay fallback callouts only.
- Pan, zoom, Fit, and Fix Offset remain aligned with the source SVG viewport.
- DB Dimensions and DB Callout Evidence panels remain source-backed.
