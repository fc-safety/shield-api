# Access Intent (`x-access-intent` header)

## Overview

The `x-access-intent` header allows system administrators to control how their API requests are processed. It replaces the previous `x-view-context` header with three distinct modes instead of two.

## Intents

### `user` (default)

Standard user mode. This is the default when the header is absent or has an unrecognized value.

- **RLS**: Enforced (client-scoped)
- **Capabilities**: From assigned role only
- **Ephemeral grants**: Disabled (system admins must have explicit `PersonClientAccess` records)
- **Who can use**: Anyone

### `elevated`

Client-scoped access with full capabilities. System admins can operate within a client's data (RLS enforced) while bypassing capability checks.

- **RLS**: Enforced (client-scoped)
- **Capabilities**: All capabilities granted regardless of assigned role
- **Ephemeral grants**: Enabled
- **Who can use**: SYSTEM scope only
- **Requires**: `x-client-id` header

### `system`

Full system access with RLS bypassed. For administrative operations that need cross-client data access.

- **RLS**: Bypassed
- **Capabilities**: All
- **Ephemeral grants**: Enabled
- **Who can use**: SYSTEM scope only

## Behavior Matrix

| Intent     | RLS      | Capabilities        | Requires `x-client-id`  | Ephemeral grants | Who can use       |
| ---------- | -------- | ------------------- | ----------------------- | ---------------- | ----------------- |
| `system`   | Bypassed | All                 | No                      | Yes              | SYSTEM scope only |
| `elevated` | Enforced | All (bypass checks) | Yes                     | Yes              | SYSTEM scope only |
| `user`     | Enforced | From assigned role  | Yes (for client access) | No               | Anyone            |

## Error Responses

| Scenario                                      | Status        | Message                                                       |
| --------------------------------------------- | ------------- | ------------------------------------------------------------- |
| Non-SYSTEM user sends `system` or `elevated`  | 403           | The 'system' access intent requires SYSTEM scope.             |
| `elevated` without `x-client-id`              | 400           | The 'elevated' access intent requires the x-client-id header. |
| `user` mode, SYSTEM admin, no explicit access | Access denied | access_grant_request_denied                                   |

## Request Flow

1. `AuthGuard` extracts intent via `getAccessIntent(request)` from `x-access-intent` header
2. `AuthService.extractOrganizationContextFromRequest()` includes `accessIntent` in the organization context
3. `AuthService.getAccessGrantForUserFromDatabase()` resolves the grant:
   - In `user` mode: skips ephemeral grants and bootstrap admin fallback
   - In `elevated` mode: overrides `grant.capabilities` to all valid capabilities
   - In `system` mode: standard ephemeral grant behavior
4. `AuthGuard` validates:
   - `system`/`elevated` requires SYSTEM scope (403 otherwise)
   - `elevated` requires `x-client-id` (400 otherwise)
5. `PrismaService.buildPrimaryExtension()` uses `accessIntent === 'system'` to determine RLS bypass

## Examples

### System admin performing cross-client operation

```
x-access-intent: system
Authorization: Bearer <token>
```

### System admin acting within a client with full capabilities

```
x-access-intent: elevated
x-client-id: <client-uuid>
Authorization: Bearer <token>
```

### System admin acting as a regular user (testing)

```
x-access-intent: user
x-client-id: <client-uuid>
Authorization: Bearer <token>
```

### Regular user (default behavior)

```
x-client-id: <client-uuid>
Authorization: Bearer <token>
```

## Related Files

- `src/common/utils.ts` - `AccessIntent` type, `getAccessIntent()` helper
- `src/auth/api-cls.service.ts` - CLS store with `accessIntent` field
- `src/auth/utils/access-grants.ts` - `IAccessContext` with `accessIntent`, cache key includes intent
- `src/auth/auth.service.ts` - Access grant resolution with intent-aware logic
- `src/auth/auth.guard.ts` - Intent extraction, validation (403/400)
- `src/prisma/prisma.service.ts` - `$accessIntent` on extended client, RLS bypass for `system`

## Migration from `x-view-context`

| Old (`x-view-context`) | New (`x-access-intent`) |
| ---------------------- | ----------------------- |
| `admin`                | `system`                |
| `user` (default)       | `user` (default)        |
| N/A                    | `elevated` (new)        |
