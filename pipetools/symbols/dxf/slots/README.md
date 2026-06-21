# PipeTools SVG slot bindings

This directory contains sourceCode-specific SVG slot maps.

Active files use PipeToolsSvgSlotBinding.v2. Version 2 uses targetBox regions in source SVG viewBox coordinates. A slot is populated only when a matching text node is found in its targetBox with sufficient confidence.

The default confidence threshold is 0.85. Overlay callouts are suppressed only after a slot is populated successfully. Failed slots leave the existing fallback available.

Use audit-svg-text-inventory.mjs to inspect source SVG text before adding a new slot map.

Run:

node pipetools/symbols/dxf/validate-svg-slots.mjs
node pipetools/symbols/dxf/audit-svg-slot-coverage.mjs --check
node --test tests/pipetools-svg-slot-binding.test.mjs
