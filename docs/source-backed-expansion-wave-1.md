# Source-backed expansion wave 1

This stage expands the foundation catalog with bounded source-backed rows after the visible Studio UI upgrade.

## Scope

Implemented phases:

- DB47: pipe Schedule 40/80 wave 1 sample promotion.
- DB48: flange Class 150/300 WN, SO, and BLIND sample promotion.
- DB49: valve Class 150 and Class 1500 RF gate valve sample promotion.
- DB50: BW fitting 45-degree and Schedule 80 elbow sample promotion.

## Source-backed rows only

All promoted numeric values come from committed source CSV rows under `docs/Pipedata/Database` and are copied into normalized public data with provenance. Blank, `N/A`, or unavailable source values remain `null` or `UNAVAILABLE`.

## Safety rules preserved

- No fabricated engineering values.
- No nearest-size fallback.
- No nearest-rating fallback.
- No nearest-schedule fallback.
- No family or subtype fallback.
- Gaskets remain inventory-only / missing-dimension.
- Supports remain project/default override or review-only.
- Reducers and olets remain unpromoted until schema approval.

## Visible effect

The Studio component browser can now list the newly indexed pipe, flange, valve, and fitting sample rows once GitHub Pages deploys the merge.
