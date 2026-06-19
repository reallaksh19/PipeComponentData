# Foundation Release Candidate Checklist

This checklist supports tagging a source-backed foundation release. It does not certify the project as a complete engineering catalog.

## Candidate

- Candidate: `v0.1.0-foundation-rc1`
- Recommended tag after acceptance: `v0.1.0-foundation`
- Release class: source-backed foundation
- Production-complete: no

## Required checks before tag

- `npm test` passes on a clean checkout.
- GitHub Actions CI is green on Node 20 and Node 22.
- GitHub Pages deployment is green after merge to `main`.
- Studio manual visual inspection is complete.
- Source-use policy is reviewed by the owner.
- Raw `docs/Pipedata/Database` is not published to Pages.

## Manual visual inspection

Open the deployed Studio and verify:

- Default valve exact match renders.
- Wrong rating returns no exact match.
- Coverage tab loads.
- Source Audit remains closed until explicitly opened.
- Release/status banner says foundation and not production-complete.
- No raw source tree is browsable from normal workflow.

## Release language

Use:

- source-backed foundation release
- exact lookup API foundation
- early Studio shell with coverage/status visibility

Do not use:

- production-complete engineering catalog
- complete piping component database
- fallback dimension service

## Next work after tag

- Expand normalized data family by family with provenance gates.
- Promote gasket/support/olet/reducer data only from verified source tables.
- Integrate GLB-PCF / 3D Viewer only through `lookupComponentExact()`.
