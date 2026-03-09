# Real-Time Events (SSE)

## Overview

Shield API provides real-time database change notifications via Server-Sent Events (SSE). Clients subscribe to model changes and receive events as they happen, powered by Redis pub/sub.

## How It Works

```
Prisma write operation (via build())
  │
  ├─ Publishes to Redis: db-events:<clientId>:<model>:<operation>
  │
  ▼
EventsService (Redis subscriber)
  │
  ├─ Filters by model, operation, and optional record IDs
  │
  ▼
SSE stream to client (with 15-second ping keepalive)
```

## Authentication

SSE connections use custom tokens (not JWTs) because EventSource doesn't support Authorization headers:

1. Client calls `POST /events/token` to get a short-lived token (24 hours)
2. Client passes the token as a query parameter when connecting to the SSE endpoint

## Subscribing to Events

Connect to the SSE endpoint with:

```typescript
// Client-side
const params = new URLSearchParams({
  token: '<custom-token>',
  models: 'Asset,Inspection',      // Required: comma-separated model names
  operations: 'create,update',      // Optional: filter by operation
  ids: 'uuid1,uuid2',              // Optional: filter by record ID
});

const source = new EventSource(`/events/db?${params}`);
source.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // { model: "Asset", operation: "create", id: "abc-123" }
};
```

## Event Payload

```json
{
  "model": "Asset",
  "operation": "create",
  "id": "cuid-of-the-record"
}
```

Operations are normalized: `createMany` → `create`, `updateMany` → `update`, `deleteMany` → `delete`.

## Channel Pattern

Redis channels follow the pattern: `db-events:<clientId>:<model>:<operation>`

When subscribing to multiple models or operations, wildcards (`*`) are used in the Redis pattern subscription.

## Keepalive

A ping event is sent every 15 seconds to keep the SSE connection alive. The stream automatically terminates if the underlying Redis subscriber disconnects.

## Key Files

- `src/events/events.service.ts` - Token generation, SSE stream management
- `src/events/events.controller.ts` - SSE endpoints
- `src/events/dto/listen-db-events.dto.ts` - Subscription parameters
- `src/prisma/prisma.service.ts` - `emitModelEvent()` publishes to Redis
