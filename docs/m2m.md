# Machine-to-Machine (M2M) API

## Overview

The M2M module provides endpoints for external systems (NFC tag scanners, legacy systems) to interact with Shield API without user authentication. Requests are authenticated via API keys.

## Authentication

M2M endpoints use API key authentication via the `x-api-key` header. Valid keys are configured in the `M2M_API_KEYS` environment variable (comma-separated).

The controller uses `@CheckPublicPolicies()` to validate the API key — no JWT or user context is required.

## Endpoints

### `GET /m2m/client-status`

Returns the status of a client account. Used by scanners to check if a client's account is active before processing a tag scan.

**Query parameters:**
- `clientId` — Client UUID (direct lookup)
- `legacyUsername` — Legacy system username (finds the user's primary client)

One of `clientId` or `legacyUsername` is required.

**Response:**
```json
{
  "id": "client-uuid",
  "status": "ACTIVE"
}
```

### `GET /m2m/tag-url`

Generates a signed URL for an NFC tag based on its legacy ID. Used during migration to program NFC tags with new URLs.

**Query parameters:**
- `legacyTagId` — The tag's ID from the legacy system

**Response:**
```json
{
  "url": "https://shield.example.com/t/...",
  "clientStatus": "ACTIVE"
}
```

## Key Files

- `src/m2m/m2m.controller.ts` - Controller with API key auth
- `src/m2m/m2m.service.ts` - Service implementation
- `src/m2m/dto/get-client-status.dto.ts` - Client status query DTO
- `src/m2m/dto/get-tag-url.dto.ts` - Tag URL query DTO
