# Caching

## Overview

Shield API uses a two-layer caching strategy: an in-process memory cache for hot data and Redis for pub/sub, queue backing, and shared state.

## Memory Cache

`MemoryCacheService` wraps NestJS `CacheManager` with request coalescing. When multiple concurrent requests ask for the same uncached key, only one factory call executes — all waiters receive the same result.

### Usage

```typescript
// Simple get/set
await this.memoryCache.set('key', value, 60_000); // 60s TTL
const value = await this.memoryCache.get<MyType>('key');

// Compute-on-miss with coalescing
const result = await this.memoryCache.getOrSet(
  'key',
  () => expensiveComputation(),
  5 * 60 * 1000, // 5 minutes
);

// Wrap a function with automatic caching
const cachedFn = this.memoryCache.wrap(
  (...args) => `cache-key:${args.join(':')}`,
  originalFunction,
  60_000,
);
```

### What's Cached

| Data | TTL | Key Pattern | Source |
|------|-----|-------------|--------|
| Access grants | 5 min | `access-grant:idpId:<id>\|client:<id>\|...` | `src/auth/utils/access-grants.ts` |
| Person records | 1 hour | `person:idpId=<id>` | `src/auth/auth.service.ts` |
| Signing keys | Indefinite | `signing-key:<keyId>` | `src/auth/auth.service.ts` |
| Allowed site IDs | 1 hour | `allowed-site-ids:siteId=<id>` | `src/prisma/prisma.service.ts:268` |
| Settings blocks | Indefinite | `settings-block:<friendlyId>` | `src/settings/settings.service.ts` |
| Client validation | Varies | `client-access:<clientId>` | `src/clients/clients/clients.service.ts` |
| Roles | 5 min | `role:<id>`, `roles` | `src/admin/roles/roles.service.ts:26` |
| Site status | 1 hour | — | `src/clients/sites/sites.service.ts:17` |

### Cache Invalidation

Use `mdel()` for bulk invalidation (e.g., when access grants change):

```typescript
await this.memoryCache.mdel(keysToInvalidate);
```

`clearAccessGrantResponseCache()` in `src/auth/utils/access-grants.ts` generates all possible cache key variants for a user+client combination across all access intents.

## Redis

`RedisService` manages two Redis connections:

- **Publisher** (`getPublisher()`) — Used for pub/sub publishing and general commands
- **Subscriber** (`getSubscriber()`) — Dedicated connection for pub/sub subscriptions

### Pub/Sub

Pattern-based subscriptions with automatic reference counting:

```typescript
// Subscribe (automatically manages pSubscribe lifecycle)
await this.redis.addPatternListener('db-events:*:Asset:*', handler);

// Unsubscribe (auto-unsubscribes from Redis when last listener removed)
await this.redis.removePatternListener('db-events:*:Asset:*', handler);
```

### BullMQ

Redis also backs the BullMQ job queues (see [notifications.md](./notifications.md)). BullMQ connects to Redis using the same host/port configuration.

## Key Files

- `src/cache/memory-cache.service.ts` - In-process cache with coalescing
- `src/redis/redis.service.ts` - Redis client management and pub/sub
- `src/redis/redis.module.ts` - Redis module
