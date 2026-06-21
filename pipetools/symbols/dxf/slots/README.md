# PipeTools SVG slot bindings

This directory contains sourceCode-specific SVG slot maps.

Active files use `PipeToolsSvgSlotBinding.v2`. Version 2 uses `targetBox` regions in source SVG viewBox coordinates. A slot is populated only when a matching text node is found in its `targetBox` with sufficient confidence.

The default confidence threshold is `0.85`. Overlay callouts are suppressed only after a slot is populated successfully. Failed slots leave the existing fallback available.

## Placeholder cleanup

Native DXF dimension scaffolds often include dash placeholders. PipeTools must not display a dash as an engineering value.

For a configured slot, unresolved placeholder text may be cleared only inside that slot's `targetBox` or optional `cleanupBox`. This is intentionally sourceCode-specific and region-scoped:

- keep the original green DXF dimension lines, leaders, and extension geometry
- clear only placeholder text such as `-`, `–`, or `—` inside the configured slot region
- never perform a global dash replacement across the SVG
- if the DB fact is missing, leave the dimension geometry in place, clear the placeholder value text, and do not suppress any overlay for a non-existent value
- if the DB fact exists but the slot cannot be populated confidently, fallback callouts remain available

Use `cleanupPlaceholderText` and `cleanupBox` when a DXF file has stale placeholder text close to, but not exactly on, the bound value node.

## Typography

Populated native values use compact, source-backed styling. Keep `nativeTextStyle` conservative. Oversized font or halo values can collide with the DXF scaffold.

## Inspection

Use `audit-svg-text-inventory.mjs` to inspect source SVG text before adding a new slot map.

Run:

```sh
node pipetools/symbols/dxf/validate-svg-slots.mjs
node pipetools/symbols/dxf/audit-svg-slot-coverage.mjs --check
node --test tests/pipetools-svg-slot-binding.test.mjs
```
