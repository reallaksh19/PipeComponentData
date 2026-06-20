# DXF callout coverage audit

This audit converts the on-canvas DB callout diagnostics into a repository-wide remediation report.

## Run

```bash
node pipetools/symbols/dxf/audit-dxf-callout-coverage.mjs
```

The script scans:

- `pipetools/data/db-index.json`
- every committed normalized DB pack referenced by `repositoryPath` / `repositoryPaths`
- `pipetools/symbols/dxf/dxf-symbol-manifest.json`
- the runtime DXF callout templates

It writes:

```text
pipetools/symbols/dxf/callout-coverage-report.json
```

Use `--check` to print the summary without writing the report:

```bash
node pipetools/symbols/dxf/audit-dxf-callout-coverage.mjs --check
```

## What the report means

The report groups coverage by DB family and DXF `sourceCode`.

- `rows` means normalized rows scanned for that family/symbol.
- `requiredChecks` means major callout labels expected by the DXF template.
- `availableChecks` means a selected row had a source-backed DB fact for that label.
- `missingChecks` means the row had no DB value for a major callout label.
- `missingExamples` gives sample row IDs and filter fields for remediation.

## Remediation policy

Missing values must not be rendered as placeholder arrows.

For each missing label, decide whether the issue is:

1. source data exists but the normalizer/extractor missed it;
2. source data is absent from the normalized JSON pack;
3. the dimension is not applicable for that subtype and the template should be refined.

Fix the data mapping or the template. Do not draw `-`, `–`, or `—` labels on the SVG canvas.

## Example workflow

```bash
node pipetools/symbols/dxf/audit-dxf-callout-coverage.mjs
```

Open `pipetools/symbols/dxf/callout-coverage-report.json`, then inspect a bucket such as:

```text
families.VALVE.symbols.Vlfl1.missing.Height
```

Use the sample row IDs to check the normalized source pack. If the source has `dimensions.heightMm` but the fact is missing, fix the normalizer or dimension extractor. If the value is truly not applicable, refine the symbol template so that field is not required for that source code/subtype.
