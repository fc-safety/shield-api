# Authentication & Authorization

## Overview

Shield API uses Keycloak as its identity provider (IdP) with JWT-based authentication. Authorization is handled through a scope + capability system that controls both data visibility and action permissions.

## Authentication Flow

```
Client Request
  │
  ├─ Authorization: Bearer <JWT>
  ├─ x-client-id: <client-uuid> (optional)
  ├─ x-site-id: <site-uuid> (optional)
  └─ x-access-intent: system|elevated|user (optional, default: user)
        │
        ▼
    AuthGuard
        │
        ├─ 1. Check @Public() / @CheckPublicPolicies() decorators
        ├─ 2. Extract and validate JWT via JWKS
        ├─ 3. Build StatelessUser from token claims
        ├─ 4. Resolve AccessGrant from PersonClientAccess records
        ├─ 5. Validate access intent against user scope
        └─ 6. Set CLS context (user, person, accessGrant, etc.)
              │
              ▼
          PoliciesGuard
              │
              ├─ Run @CheckPolicies() handlers (require auth)
              └─ Run @CheckPublicPolicies() handlers (optional auth)
                    │
                    ▼
                Controller
```

## JWT Validation

The API validates JWTs using JWKS (JSON Web Key Set) fetched from Keycloak:

- **JWKS URI**: Configured via `AUTH_JWKS_URI` env var
- **Issuer**: Validated against `AUTH_ISSUER`
- **Audience**: Validated against `AUTH_AUDIENCE`
- **Key caching**: JWKS keys are cached with rate limiting (5 requests/minute)

Token claims are mapped to a `StatelessUser` object via `buildUserFromToken()` in `src/auth/user.schema.ts`.

## Access Grants

An **AccessGrant** represents a user's resolved permissions for a request. It contains:

- **scope** - Data visibility level (see Scopes below)
- **capabilities** - Action permissions (see Capabilities below)
- **clientId** - The client context
- **siteId** - The site context
- **roleId** - The role that granted this access

### Resolution Flow

1. Query all `PersonClientAccess` records for the user
2. If `x-client-id` is specified, filter to matching records
3. Otherwise, use the primary access record (`isPrimary: true`)
4. If multiple records match, **reduce** them: use the most permissive scope, combine all capabilities
5. Validate that the client and site are active (for non-global scopes)

### Bootstrap Admin Fallback

Users listed in `SYSTEM_ADMIN_EMAILS` receive ephemeral SYSTEM grants when:
- They have no access records, OR
- They request a client they don't have explicit access to

This only works with `system` or `elevated` access intent (not `user`).

## Scopes

Scopes control **how much data** a user can see. Defined in `src/auth/utils/scope.ts`.

| Scope | Description | RLS Behavior |
|-------|-------------|--------------|
| `SYSTEM` | Full system access (FC Safety internal) | Can bypass RLS |
| `GLOBAL` | All clients | Enforced, but client/site activation not required |
| `CLIENT` | All sites within assigned client | Enforced, site activation not required |
| `SITE_GROUP` | Multiple specific sites | Fully enforced |
| `SITE` | Single assigned site | Fully enforced |
| `SELF` | Only own records | Fully enforced |

Scope comparison: `isScopeAtLeast(userScope, requiredScope)` returns true if the user's scope is at least as permissive.

## Capabilities

Capabilities control **what actions** a user can perform. Defined in `src/auth/utils/capabilities.ts`.

| Capability | Description |
|-----------|-------------|
| `perform-inspections` | Read tags/assets/questions, create inspections |
| `submit-requests` | Create product and supply requests |
| `manage-assets` | CRUD assets, consumables, tags |
| `manage-routes` | Create/edit inspection routes and schedules |
| `resolve-alerts` | Review and resolve inspection alerts |
| `view-reports` | Access compliance reports and statistics |
| `manage-users` | Create users, assign roles, send invitations |
| `configure-products` | Manage product catalog, categories, questions |
| `approve-requests` | Approve/reject product and supply requests |
| `program-tags` | Generate tag URLs, program NFC tags |
| `register-tags` | Register assets to tags |

## Policy Decorators

Use these decorators on controller methods to enforce authorization. Defined in `src/auth/utils/policies.ts`.

### Endpoint Access

```typescript
@Public()                           // No auth required
@SkipAccessGrantValidation()        // Auth required, but no client/site needed
```

### Capability Checks

```typescript
@CheckCapability('manage-assets')               // Requires specific capability
@CheckAnyCapability('manage-assets', 'view-reports')  // Requires any one
@CheckAllCapabilities('manage-assets', 'manage-routes') // Requires all
```

### Scope Checks

```typescript
@CheckScope(RoleScope.CLIENT)     // Requires CLIENT scope or above
@CheckSystemAdmin()               // Requires SYSTEM scope
@CheckGlobalAdmin()               // Requires GLOBAL or SYSTEM scope
@CheckClientAdmin()               // Requires CLIENT scope or above
```

### Custom Policies

```typescript
@CheckPolicies(({ accessGrant, request }) => {
  // Custom logic, return boolean
  return accessGrant.hasCapability('manage-assets');
})
```

## CLS (Continuation-Local Storage)

Request context is stored in CLS via `ApiClsService` and is available throughout the request lifecycle:

| Key | Type | Description |
|-----|------|-------------|
| `user` | `StatelessUser` | JWT-derived user data |
| `person` | `Person` | Database person record (upserted each request) |
| `accessGrant` | `AccessGrant` | Resolved permissions |
| `accessIntent` | `AccessIntent` | `system`, `elevated`, or `user` |
| `isPublic` | `boolean` | Whether the endpoint is public |
| `mode` | `string` | `request` or `cron` |
| `useragent` | `string` | Request user agent |
| `ipv4` / `ipv6` | `string` | Client IP address |

## Custom Tokens

The `AuthService` can generate and validate custom HMAC-signed tokens (used for SSE event streams, tag URLs, etc.):

```typescript
// Generate a token with a 24-hour expiry
const token = await authService.generateCustomToken({ clientId, siteId }, 86400);

// Validate and extract payload
const { isValid, payload, error } = await authService.validateCustomToken(token);
```

Tokens use HMAC-SHA256 with signing keys stored in the `SigningKey` database table.

## Key Files

- `src/auth/auth.guard.ts` - Global auth guard
- `src/auth/auth.service.ts` - JWT validation, access grant resolution, signing
- `src/auth/policies.guard.ts` - Policy enforcement guard
- `src/auth/api-cls.service.ts` - CLS context management
- `src/auth/user.schema.ts` - JWT token → user mapping
- `src/auth/utils/access-grants.ts` - AccessGrant class and reduction logic
- `src/auth/utils/capabilities.ts` - Capability definitions
- `src/auth/utils/scope.ts` - Scope hierarchy and comparison
- `src/auth/utils/policies.ts` - Policy decorator definitions
