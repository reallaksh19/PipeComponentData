# Integrating the DXF Symbol Library into PipeTools

## Goal

Use the DXF-derived SVG manifest as the only production symbol source for piping components. Do not continue the old hand-coded primitive renderer as the target UI for component symbols.

## Static viewer

The standalone viewer is available at:

```text
pipetools/symbols/dxf/index.html
```

It works without a build step and is suitable for GitHub Pages. It first tries to load `dxf-symbol-manifest.json`; if `fetch()` is blocked during direct local file preview, it uses `dxf-symbol-manifest.js`.

## Runtime API

After loading `js/symbol-library.js`, the following API is exposed:

```js
window.DxfSymbolLibrary.resolveSymbolForComponent(row)
window.resolveSymbolForComponent(row)
```

Example:

```js
const result = resolveSymbolForComponent({
  componentType: 'VALVE',
  valveType: 'GATE',
  endType: 'FLANGED',
  nps: '6',
  classRating: '300',
  facing: 'RF'
});

if (result.status === 'OK') {
  detailPanel.innerHTML = `<img src="${result.svg}" alt="${result.symbol.title}">`;
} else {
  detailPanel.textContent = 'SVG_NOT_AVAILABLE';
}
```

The resolver matches normalized component fields against each manifest entry's `dbLookup`. Important keys include `componentType`, `subtype`, `valveType`, `endType`, `reducerType`, `oletType`, `facing`, `classRating`, and `nps` where useful. If no exact DXF mapping exists, it returns `SVG_NOT_AVAILABLE` instead of guessing.

## Dashboard/table/detail-panel wiring

Recommended flow for the main PipeTools UI:

1. User clicks a dashboard family/type tile.
2. Table filters to matching normalized rows from the current DB pack.
3. User selects a row in the table.
4. Call `resolveSymbolForComponent(selectedRow)`.
5. If `OK`, render `result.symbol.svg` in the detail SVG panel.
6. If `SVG_NOT_AVAILABLE`, show an explicit empty state with the unresolved row keys.

Minimal adapter:

```js
function updateSymbolDetailForRow(row) {
  const result = resolveSymbolForComponent(row);
  if (result.status !== 'OK') {
    symbolDetail.innerHTML = '<div class="empty">SVG_NOT_AVAILABLE</div>';
    return;
  }
  symbolDetail.innerHTML = `
    <img src="pipetools/symbols/dxf/${result.svg}" alt="${result.symbol.title}">
    <dl>
      <dt>DXF Code</dt><dd>${result.symbol.sourceCode}</dd>
      <dt>Standard</dt><dd>${result.symbol.standard || '-'}</dd>
    </dl>`;
}
```

Adjust the relative image prefix depending on the hosting page location.

## Optional DB hydration

The viewer attempts to load `pipetools/data/db-index.json` and the family runtime packs. Failure is non-fatal. When hydration succeeds, cards show matched normalized DB row counts. This is only an observability aid; the manifest remains the source of symbol mapping.

## Migration from old hand-drawn symbols

Replace calls like:

```js
renderValveGatePrimitive(row)
renderPipePrimitive(row)
getGenericFittingIcon(row)
```

with:

```js
const resolved = resolveSymbolForComponent(row);
```

Do not route missing mappings to a generic pipe/fitting/valve symbol. Add a manifest entry only when a real DXF-derived SVG exists.

## Follow-up integration tasks

- Import this folder into the deployed PipeTools asset tree.
- Add a small table-selection hook that calls `resolveSymbolForComponent(row)`.
- Update `pipetools/data/db-index.json` `svgSupported` flags for families now covered by this DXF library, especially `REDUCER` and `OLET`.
- Add a CI check that validates every manifest `svg` path exists and every source code is unique.
- Continue mapping the remaining converted DXF symbols into the manifest.
