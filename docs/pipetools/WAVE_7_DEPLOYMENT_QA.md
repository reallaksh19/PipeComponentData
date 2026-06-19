# Wave 7 — GitHub Pages Deployment QA

## Scope

Wave 7 locks the PipeTools static deployment contract after Waves 1 through 6 are merged.

It verifies:

- cumulative PipeTools gates are preserved in both CI workflows;
- the GitHub Pages artifact contains PipeTools, SPL2, and public normalized data;
- the Pages root redirects to `./pipetools/`;
- raw source database folders are not published;
- merged product tabs remain discoverable from the static app bundle.

## Branch

`agent10/wave-7-deployment-qa`

## New gate

```bash
node --test gates/pipetools-agent-10-deployment-qa.gate.test.js
```

## CI expectations

Both `.github/workflows/pipetools-ci.yml` and `.github/workflows/pages.yml` must run every cumulative PipeTools gate from Agent 00-03 through Agent 10.

## Static artifact contract

The Pages workflow must publish at least:

- `_site/pipetools/index.html`
- `_site/pipetools/js/app.js`
- `_site/pipetools/js/search/search.js`
- `_site/pipetools/js/svg/inspector.js`
- `_site/pipetools/js/pipeSpan/calculate.js`
- `_site/spl2-bundle/spl2_master.html`
- `_site/data/normalized/valves.json`
- `_site/data/search/component-aliases.json`
- `_site/data/indexes/component-search.index.json`

## Non-goals

This wave does not add new calculation features, visual design changes, or a browser automation framework. It is a static deployment and route-smoke QA layer.
