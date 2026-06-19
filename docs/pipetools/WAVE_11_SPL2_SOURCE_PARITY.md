# Wave 11 — SPL2 Source-Parity Revamp

This wave replaces the compact placeholder SPL2 iframe shell with a closer source-parity dashboard derived from the connected `reallaksh19/Simplified_Analysis` SPL2 bundle.

## Implemented

- Source-style left sidebar navigation:
  - Loop Calculations
  - Pipe Rack Calculation
  - Simplified Method
  - Database
  - 2D Bundle Config
  - Diagnostics
- Source-style dark engineering theme using `spl2-bundle/css/app.css`.
- Source-compatible canvas/input identifiers:
  - `canvas-loop`
  - `canvas-rack-section`
  - `canvas-rack-plan`
  - `canvas-simp-3d`
  - `loop_inp_s`, `loop_inp_g`, `loop_inp_h`, `loop_inp_w`
  - `global_inp_units`, `global_inp_ins_dens`
- Working static calculations and canvas drawings for loop, rack, and simplified tabs.
- Database/config/diagnostics panes so the UI shape matches the upstream bundle.

## Boundary

This is a static-safe parity shell for GitHub Pages. It does not yet vendor every upstream source file 1:1 because that requires a larger import and size review. It removes the earlier placeholder-style UI and restores the source module structure, IDs, and options required for subsequent exact import.
