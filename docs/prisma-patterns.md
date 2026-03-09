# Prisma & Database Patterns

## Overview

Shield API uses Prisma ORM with PostgreSQL, extended with Row-Level Security (RLS) enforced via PostgreSQL session variables. The `PrismaService` provides different client modes depending on the security context needed.

## Client Modes

### `build()` — Standard RLS-enforced queries

Use this for all normal user-facing operations. It sets RLS session variables based on the current user's access grant.

```typescript
const prisma = await this.prisma.build();
await prisma.asset.findMany(); // Only returns assets the user can see
```

**How RLS is determined:**
- If `accessIntent === 'system'` AND user has SYSTEM scope → RLS is bypassed
- If `mode === 'cron'` → RLS is bypassed
- If `shouldBypassRLSAsSystemAdmin` option is true AND user has SYSTEM scope → RLS is bypassed
- Otherwise → RLS is enforced with the user's client/site context

```typescript
// Explicitly bypass RLS for system admin operations
const prisma = await this.prisma.build({ shouldBypassRLSAsSystemAdmin: true });
```

### `bypassRLS()` — Administrative queries

Use this for operations that need to read/write across tenant boundaries (e.g., auth resolution, cron jobs, cross-client lookups).

```typescript
const prisma = this.prisma.bypassRLS();
await prisma.person.findUnique({ where: { idpId } }); // No tenant filtering
```

**Important:** `bypassRLS()` is synchronous (no `await` needed). It sets `app.bypass_rls = 'on'` in the PostgreSQL session.

## RLS Session Variables

Every query (even bypass) executes within a transaction that first sets PostgreSQL session variables:

| Variable | Set When | Purpose |
|----------|----------|---------|
| `app.bypass_rls` | Bypass mode | Set to `'on'` to skip all RLS policies |
| `app.current_client_id` | RLS enforced | Current tenant context |
| `app.current_site_id` | RLS enforced | Current site context |
| `app.allowed_site_ids` | RLS enforced | Comma-separated list of accessible site IDs |
| `app.current_person_id` | RLS enforced | Current user's person ID |
| `app.current_user_scope` | RLS enforced | User's role scope |

These are set via `SELECT set_config(...)` with `TRUE` for transaction-scoped settings.

### Allowed Site IDs

Site hierarchies are flattened 3 levels deep. If a user has access to a parent site, they also get access to its subsites:

```
Parent Site
├── Subsite A
│   ├── Sub-subsite A1
│   │   └── Sub-sub-subsite A1a  (max depth)
│   └── Sub-subsite A2
└── Subsite B
```

This is cached for 1 hour via `getAllowedSiteIdsForSite()`.

## Transactions

The `$transaction` method is wrapped to ensure RLS context is set before executing the transaction body:

```typescript
const prisma = await this.prisma.build();
await prisma.$transaction(async (tx) => {
  // RLS context is already set inside this transaction
  await tx.asset.create({ data: { ... } });
  await tx.inspection.create({ data: { ... } });
});
```

### PrismaTxClient Type

Use `PrismaTxClient` when passing a transaction client to helper functions:

```typescript
import { PrismaTxClient } from 'src/prisma/prisma.service';

async function createAssetWithTag(tx: PrismaTxClient, data: CreateAssetDto) {
  const asset = await tx.asset.create({ data });
  await tx.tag.create({ data: { assetId: asset.id } });
  return asset;
}
```

## Model Events

Write operations (`create`, `update`, `delete` and their `*Many` variants) automatically emit events to Redis pub/sub when using `build()`:

```
Channel: db-events:<clientId>:<model>:<operation>
Payload: { model, operation, id }
```

These events power the real-time SSE event stream (see `src/events/`).

## Pagination

Use the `findManyForPage` extension method for paginated queries:

```typescript
const prisma = await this.prisma.build();
const { results, count, limit, offset } = await prisma.asset.findManyForPage({
  where: { ... },
  skip: 0,
  take: 20,
});
```

This runs `count()` and `findMany()` in parallel and returns both results with metadata.

## Query Logging

All queries are logged at the `verbose` level with:
- Parsed model name and action (from SQL)
- Query parameters
- Duration in milliseconds

## Key Files

- `src/prisma/prisma.service.ts` - Core service with RLS extensions
- `src/prisma/prisma.module.ts` - Global module (no imports needed)
- `src/prisma/prisma.adapter.ts` - Prisma adapter configuration
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/` - Migration history
