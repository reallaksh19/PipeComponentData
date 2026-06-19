# Changelog

## v0.1.0-foundation-rc1

Foundation release candidate for the PipeComponentData source-backed DB/API and Studio shell.

### Added

- Adapter/API gates through Phase 13.
- DB gates through Phase 21.
- Exact lookup API facade: `lookupComponentExact()` and `LOOKUP_STATUS`.
- TypeScript declarations for the stable public API.
- Public export-pack and downstream integration manifests.
- Studio exact-search workflow, source-audit separation, coverage view, browser-smoke gate, and release-status banner.
- Data governance/source-use policy and release-readiness audit artifacts.

### Safety policy

- Exact match only.
- No nearest-size, nearest-rating, or nearest-schedule engineering fallback.
- No fabricated dimensions, weights, schedules, ratings, or gasket/support values.
- Missing engineering values remain `null` or `UNAVAILABLE`.
- Raw `docs/Pipedata/Database` is not published to GitHub Pages.

### Known limitations

- Full normalized production coverage is incomplete.
- Gasket, support, olet, reducer, and some fitting families remain partial or placeholder-backed.
- Source-use rights need owner review before broader publication decisions.
- Viewer/converter integration is not wired yet; downstream apps must use the exact lookup API contract when integration begins.
