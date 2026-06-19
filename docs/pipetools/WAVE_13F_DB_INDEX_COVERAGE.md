# Wave 13F — DB Index Coverage Browser

## Goal

Show the current indexing status directly in PipeTools so the user can see how many database items are already promoted into normalized runtime DBs and how many source rows still remain pending.

## Current coverage from `pipetools/data/db-index.json`

- DB families indexed: 6
- Source DB files inventoried: 37
- Source rows inventoried: 720
- Runtime indexed rows promoted: 56
- Pending rows to promote/index: 664
- SVG-supported families: 5 of 6

## Scope

- Added `pipetools/js/db/dbCoverage.js`.
- Added `pipetools/dbCoverage.css`.
- Rendered the coverage browser above the selected DB strip.
- Each family row is clickable and routes through the existing component selector.
- Added Agent 21 CI gate.

## Not in this wave

- No source DB promotion/import expansion.
- No raw DB tree is published to Pages.
- No SVG engine logic changes.
