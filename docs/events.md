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

## Supported Models

The following models can be subscribed to:

`Manufacturer`, `ProductCategory`, `Product`, `Asset`, `Alert`, `Inspection`, `InspectionRoute`, `ProductRequest`

## Subscribing to Events

Connect to the SSE endpoint with array-style query parameters:

```typescript
// Client-side
const params = new URLSearchParams();
params.append('token', '<custom-token>');
params.append('models', 'Asset');          // Required: one per model
params.append('models', 'Inspection');     // Repeat for multiple models
params.append('operations', 'create');     // Optional: filter by operation
params.append('operations', 'update');
params.append('ids', 'uuid1');             // Optional: filter by record ID

const source = new EventSource(`/events/db/listen?${params}`);
source.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // { model: "Asset", operation: "create", id: "abc-123" }
};
```

Note: Query parameters use array format (`?models=Asset&models=Inspection`), not comma-separated values.

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
