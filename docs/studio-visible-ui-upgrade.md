# Studio visible UI upgrade

This stage converts the Pipe Component Studio from a mostly lookup-oriented shell into a visibly useful catalog browser.

## Scope

Implemented phases:

- Phase 42: landing dashboard with catalog summary cards.
- Phase 43: component family browser with table rows for promoted public index entries.
- Phase 44: row detail drawer for identity, status, and unavailable-field count.
- Phase 45: provenance panel that shows safe source tokens by default while keeping raw source paths behind explicit Source Audit.
- Phase 46: responsive layout, badges, table states, and mobile-friendly CSS.

## Safety rules preserved

- No normalized engineering values were changed.
- No source rows were promoted.
- No search-index entries were changed.
- No nearest-size, nearest-rating, nearest-schedule, family, or subtype fallback was added.
- Raw source database paths remain hidden from the normal Studio page and Pages navigation.

## Visible result

After GitHub Pages deploys the branch merge, users should see:

- dashboard summary cards,
- family tabs with row counts,
- a browsable component table,
- READY / PARTIAL / MISSING badges,
- a selected-row detail drawer,
- a safe provenance summary,
- existing exact-match selector and CAD preview.

The Source Audit panel remains explicit and separate for raw provenance inspection.
