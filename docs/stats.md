# Stats Module

The stats module (`src/stats/`) provides compliance reporting and statistics.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats/compliance-history` | Monthly compliance history |

## Compliance History

Returns monthly compliance breakdown with assets grouped by status:

| Status | Meaning |
|--------|---------|
| `COMPLIANT_DUE_LATER` | Inspected, next inspection not due soon |
| `COMPLIANT_DUE_SOON` | Inspected, due within threshold |
| `NON_COMPLIANT_INSPECTED` | Last inspection is overdue |
| `NON_COMPLIANT_NEVER_INSPECTED` | No inspection recorded |

The "due soon" threshold is the greater of: `inspectionCycle - 7 days` or `inspectionCycle / 2`.

Supports multi-month historical queries by merging inspection data across time periods.

## Key Files

- `src/stats/stats.controller.ts`
- `src/stats/stats.service.ts`
- `src/stats/dto/query-compliance-history.dto.ts`
