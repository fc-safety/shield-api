# Legacy Migration Module

The legacy migration module (`src/legacy-migration/`) provides tools for migrating data from the previous MySQL-based system to Shield API.

## Overview

Migration is performed over WebSocket connections to support long-running operations with real-time progress feedback. The module connects to the legacy MySQL/MariaDB database and maps old records to the new Prisma models.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/legacy-migration/ws-token` | System admin | Get WebSocket auth token |

The actual migration runs over a WebSocket gateway (`legacy-migration.gateway.ts`) authenticated with the token from above.

## Legacy ID Mapping

Many Prisma models include `legacy*Id` fields for cross-referencing:
- `Asset.legacyAssetId`
- `Tag.legacyTagId`
- `Person.legacyUsername`
- etc.

These fields are used during migration and by the M2M API for backwards compatibility with scanners still using legacy IDs.

## Configuration

Requires legacy database credentials in `.env`:
```
LEGACY_DB_HOST=
LEGACY_DB_USER=
LEGACY_DB_PASSWORD=
LEGACY_DB_NAME=
LEGACY_DB_PORT=3306
```

## Key Files

- `src/legacy-migration/legacy-migration.controller.ts` — Token endpoint
- `src/legacy-migration/legacy-migration.gateway.ts` — WebSocket gateway
- `src/legacy-migration/legacy-migration.service.ts` — Migration logic
