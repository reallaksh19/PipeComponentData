# Source Promotion Preflight

This document records the conservative DB29-DB31 decision for families that are not yet promoted as source-backed engineering catalogs.

The preflight artifact is:

```txt
data/audit/source-promotion-preflight.json
```

## DB29 - Reducer and Olet preflight

Reducer-like source evidence requires manual schema review before promotion. The raw inventory has swage/BW fitting sources, but the project does not yet have a reducer-specific normalized schema or mapping rule.

Olet source folders exist in the raw inventory (`Wbol`, `Wbpi`), but no normalized olet catalog has been approved. Olet rows must not be inferred from branch-fitting names or PCF behavior.

## DB30 - Gasket source decision

Gasket rows remain inventory/selector rows only. Numeric gasket dimensions remain `null` with `UNAVAILABLE` basis until parseable, rights-approved gasket dimension tables are promoted.

## DB31 - Support and span source preflight

Support rows remain project/default rules. Span/Gpas inventory is treated as selector/config/sketch availability until a source-backed support/span parser is approved.

## Safety rule

No reducer, olet, gasket, support, or span engineering dimensions may be added by assumption, nearest match, project habit, or visual inference.
