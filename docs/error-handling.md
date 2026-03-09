# Error Handling

## Overview

Shield API uses a combination of NestJS exception filters, guards, and Sentry integration for error handling and monitoring.

## PrismaErrorsFilter

A global exception filter (`src/common/prisma-errors.filter.ts`) catches `PrismaClientKnownRequestError` exceptions and converts them to HTTP responses.

Currently, all Prisma errors return a generic 500 response to avoid leaking database details. The filter logs the full error and reports it to Sentry via `@SentryExceptionCaptured()`.

For intentional 404 handling, use the `as404OrThrow()` helper from `src/common/utils.ts`:

```typescript
import { as404OrThrow } from 'src/common/utils';

try {
  return await prisma.asset.update({ where: { id }, data: dto });
} catch (e) {
  as404OrThrow(e); // Converts P2025 (record not found) to NotFoundException
}
```

## Request Pipeline

```
Request
  │
  ├─ Global Filters: PrismaErrorsFilter
  ├─ Global Guards: AuthGuard → PoliciesGuard
  ├─ Route-level: Zod validation (via DTOs)
  │
  ▼
Controller → Service → Prisma
```

## Auth Errors

| Error | HTTP Status | When |
|-------|-------------|------|
| Missing/invalid JWT | 401 Unauthorized | Token validation fails |
| Expired JWT | 401 Unauthorized | Token has expired |
| No access grant | 403 (custom) | User has no `PersonClientAccess` records |
| Client inactive | 403 (custom) | Client status is not ACTIVE |
| Site inactive | 403 (custom) | Site is not active |
| Wrong access intent | 403 Forbidden | Non-SYSTEM user uses `system`/`elevated` intent |
| Missing x-client-id | 400 Bad Request | `elevated` intent without client header |
| Policy check failed | 403 Forbidden | `@CheckPolicies` handler returns false |

Access grant failures return structured error responses with a `reason` field (e.g., `no_access_grant`, `client_inactive`, `access_grant_request_denied`).

## Validation Errors

Zod DTOs (via `nestjs-zod`) automatically return 400 responses with detailed validation errors when request bodies or query parameters don't match the schema.

## Sentry Integration

Error tracking is configured via `src/instrument.ts` (imported first in `main.ts`). Source maps are uploaded during build via `npm run sentry:sourcemaps`.

## Key Files

- `src/common/prisma-errors.filter.ts` - Global Prisma error filter
- `src/common/utils.ts` - `as404OrThrow()` helper
- `src/auth/auth.guard.ts` - Authentication errors
- `src/auth/policies.guard.ts` - Authorization errors
- `src/auth/auth.exception.ts` - Custom access grant exception
- `src/instrument.ts` - Sentry setup
