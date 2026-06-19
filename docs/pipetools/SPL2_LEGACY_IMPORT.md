# SPL2 2D Bundle Import Boundary

Wave 5 brings the 2D calculation bundle into PipeTools as an isolated static iframe target.

## Source reference

The source design is from `reallaksh19/Simplified_Analysis`:

- `src/spl2-bundle/Spl2BundleTab.jsx`
- `src/spl2-bundle/Spl2Frame.jsx`
- `public/spl2-bundle/spl2_master.html`
- `public/spl2-bundle/js/spl2/spl2_master.js`

## Current implementation

PipeTools serves:

- `spl2-bundle/spl2_master.html`
- `spl2-bundle/js/spl2/spl2_master.js`

The app tab uses an iframe at `../spl2-bundle/spl2_master.html`.

## Governance

New wrapper/source modules must remain below the relaxed 300-line PipeTools gate. The current static bundle shell is kept compact and below that limit.

The full upstream legacy bundle contains large HTML/CSS/JS files. Importing those exact files requires a dedicated approval note and should be treated as copied legacy assets, not new source modules.

## Isolation rule

SPL2 does not share state with PipeSpec DB or Pipe Span. Any future data exchange must go through an explicit message bridge with validation.
