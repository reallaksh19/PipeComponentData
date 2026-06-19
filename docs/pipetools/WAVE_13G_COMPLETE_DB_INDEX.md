# Wave 13G — Complete DB index coverage

## Scope

Wave 13G completes the PipeTools database browser coverage by indexing every committed normalized runtime DB pack.

## Indexed families

- PIPE
- VALVE
- FLANGE
- FITTING
- GASKET
- SUPPORT
- REDUCER
- OLET

## Coverage result

| Family | Indexed rows | Pending rows |
|---|---:|---:|
| PIPE | 454 | 0 |
| VALVE | 410 | 0 |
| FLANGE | 254 | 0 |
| FITTING | 15 | 0 |
| GASKET | 3 | 0 |
| SUPPORT | 2 | 0 |
| REDUCER | 858 | 0 |
| OLET | 140 | 0 |

Total indexed rows: 2,136.
Pending rows: 0.
Coverage: 100% for committed normalized DB packs.

## Implementation notes

The browser now supports multi-pack family loading. A selected family can load several normalized JSON files and de-duplicate rows by stable `id`.

Raw source CSV folders remain unpublished. Only normalized runtime packs are loaded by PipeTools.
