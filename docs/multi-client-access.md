# Multi-Client Access

This document describes the multi-client access feature, which allows users to access multiple clients with per-client role and site assignments.

## Overview

Previously, each user (Person) belonged to exactly one client and one site. This was limiting for scenarios where:

- Higher-level administrators need to manage multiple clients
- Inspectors work for multiple clients (e.g., contractors)
- Support staff need to access client data for troubleshooting

The multi-client access feature enables users to access multiple clients, with each client assignment having its own:
- **Site**: The site within that client the user has access to
- **Role**: A set of permissions specific to that client

## Database Schema

### New Models

```prisma
model Role {
  id          String   @id @default(cuid(2))
  name        String
  description String?
  isSystem    Boolean  @default(false)  // System roles can't be deleted
  clientId    String?                   // null = global role, set = client-specific
  permissions RolePermission[]

  @@unique([name, clientId])
}

model RolePermission {
  id         String @id @default(cuid(2))
  roleId     String
  permission String  // e.g., "visibility:client-sites", "read:assets"

  @@unique([roleId, permission])
}

model PersonClientAccess {
  id        String  @id @default(cuid(2))
  personId  String
  clientId  String
  siteId    String  // The site within this client the user can access
  roleId    String  // The role (permissions) for this client
  isPrimary Boolean @default(false)  // Reserved for future use

  @@unique([personId, clientId])  // One access entry per person per client
}
```

### Key Points

- **Role** can be global (`clientId = null`) or client-specific
- **RolePermission** stores individual permission strings (e.g., `visibility:single-site`, `read:assets`)
- **PersonClientAccess** maps a person to a client with a specific site and role
- The `isPrimary` flag is reserved for future use (e.g., default client selection)

## How Client Switching Works

### Request Flow

```
┌─────────────┐     ┌─────────────┐     ┌───────────────────┐     ┌───────────────┐
│   Request   │────>│  AuthGuard  │────>│ ActiveClientGuard │────>│ PeopleService │
│ x-client-id │     │ (extract)   │     │ (validate)        │     │ (build repr)  │
└─────────────┘     └─────────────┘     └───────────────────┘     └───────────────┘
```

1. **Client sends request** with optional `x-client-id` header containing the external client ID
2. **AuthGuard** extracts the header and stores it in CLS as `activeClientId`
3. **ActiveClientGuard** validates the user has access to the requested client via `PersonClientAccess`
4. **PeopleService** builds a `PersonRepresentation` with the switched client context

### Detailed Steps

#### 1. AuthGuard (`src/auth/auth.guard.ts`)

```typescript
// Extract active client from x-client-id header for multi-client access
const activeClientId = request.headers['x-client-id'];
if (activeClientId && typeof activeClientId === 'string') {
  this.cls.set('activeClientId', activeClientId);
}
```

The guard stores the header value in the request-scoped CLS store, making it available to downstream services.

#### 2. ActiveClientGuard (`src/clients/guards/active-client.guard.ts`)

```typescript
const activeClientId = this.cls.get('activeClientId');
let clientExternalId = user.clientId;  // Primary from JWT
let siteExternalId = user.siteId;

// Only validate if switching to a different client
if (activeClientId && activeClientId !== user.clientId) {
  const accessSiteExternalId = await this.clientsService.validateClientAccess(
    user.idpId,
    activeClientId,
  );

  if (!accessSiteExternalId) {
    throw new ForbiddenException({
      message: 'You do not have access to the requested client.',
      error: 'client_access_denied',
      statusCode: 403,
    });
  }

  clientExternalId = activeClientId;
  siteExternalId = accessSiteExternalId;
}
```

Key behaviors:
- If `x-client-id` matches the user's primary client, no validation needed
- If switching to a different client, check `PersonClientAccess` table
- Returns the site external ID from the access record for RLS context

#### 3. ClientsService.validateClientAccess (`src/clients/clients/clients.service.ts`)

```typescript
public async validateClientAccess(
  idpId: string,
  clientExternalId: string,
): Promise<string | null> {
  const cacheKey = `client-access:${idpId}:${clientExternalId}`;

  // Check cache first
  const cachedValue = await this.cache.get<string | null>(cacheKey);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  // Query PersonClientAccess
  const access = await this.prisma.bypassRLS().personClientAccess.findFirst({
    where: {
      person: { idpId },
      client: { externalId: clientExternalId },
    },
    select: {
      site: { select: { externalId: true } },
    },
  });

  const siteExternalId = access?.site.externalId ?? null;

  // Cache for 1 hour
  this.cache.set(cacheKey, siteExternalId, 60 * 60 * 1000);

  return siteExternalId;
}
```

#### 4. PeopleService.getPersonRepresentation (`src/clients/people/people.service.ts`)

When `activeClientId` is set and differs from the primary client:

1. **Ensure person exists** using primary client credentials (from JWT)
2. **Look up PersonClientAccess** for the switched client
3. **Extract permissions** from the associated Role
4. **Build PersonRepresentation** with switched client/site/permissions

```typescript
// Check for client switching
const activeClientId = this.cls.get('activeClientId');
if (activeClientId && activeClientId !== user.clientId) {
  return this.getSwitchedClientContext(person.id, activeClientId);
}
```

The switched context includes:
- **clientId**: Internal ID of the switched client
- **siteId**: Internal ID of the site from PersonClientAccess
- **visibility**: Extracted from role permissions (e.g., `visibility:client-sites` → `client-sites`)
- **permissions**: All permissions from the role
- **allowedSiteIdsStr**: The site and all its subsites (for RLS)

## Design Decisions

### Why Explicit Client Switching via Header?

**Decision**: Use `x-client-id` header instead of session-based or implicit context.

**Rationale**:
- **Stateless**: No server-side session to manage; each request is self-contained
- **Simpler RLS**: Only one client context active at a time
- **Clear UX**: Client must explicitly indicate which client they're operating as
- **Debugging**: Easy to trace which client context was used for any request

### Why Database Roles Instead of Keycloak Groups?

**Decision**: Store roles and permissions in the database rather than Keycloak.

**Rationale**:
- **Per-client permissions**: Users can have different roles for different clients
- **Fine-grained control**: Admins can adjust permissions without touching IdP
- **Simpler migration**: Can gradually move users without Keycloak reconfiguration
- **Self-service potential**: Future UI for client admins to manage their own roles

### Why One Person Record with Multiple Access Entries?

**Decision**: Single `Person` record with multiple `PersonClientAccess` entries.

**Rationale**:
- **Single identity**: Email, name, idpId remain consistent
- **Simpler queries**: Find person once, then check their access
- **Audit trail**: All activity tied to one person across clients
- **No sync issues**: No need to keep multiple person records in sync

### Why Bypass RLS for Tag Reading?

**Decision**: Tags bypass RLS and check access at application level.

**Rationale**:
- **Cross-client discovery**: When scanning a tag, the app doesn't know which client it belongs to
- **Better UX**: Can return "you don't have access" instead of "tag not found"
- **Simpler RLS**: No need for complex `allowed_client_ids` in RLS policies

### Caching Strategy

**Decision**: Cache `validateClientAccess` results for 1 hour.

**Rationale**:
- **Performance**: Avoid database query on every request when switching clients
- **Freshness**: 1 hour is short enough that revoked access becomes effective soon
- **Invalidation**: Future enhancement can invalidate on PersonClientAccess changes

## RLS Session Variables

The existing RLS variables continue to work:

| Variable | Description |
|----------|-------------|
| `app.current_client_id` | Internal ID of active client (primary or switched) |
| `app.current_site_id` | Internal ID of active site |
| `app.allowed_site_ids` | Comma-separated site IDs (site + subsites) |
| `app.current_person_id` | Internal ID of the person |
| `app.current_user_visibility` | Visibility level (super-admin, client-sites, etc.) |

When switching clients, these variables reflect the switched context, not the primary.

## API Usage

### Accessing Primary Client (Default)

```http
GET /api/assets
Authorization: Bearer <token>
```

Uses the client/site from the JWT claims.

### Accessing a Different Client

```http
GET /api/assets
Authorization: Bearer <token>
x-client-id: other-client-external-id
```

Uses the client/site from the user's `PersonClientAccess` for that client.

### Error Responses

**No access to requested client:**
```json
{
  "statusCode": 403,
  "error": "client_access_denied",
  "message": "You do not have access to the requested client."
}
```

**Requested client is inactive:**
```json
{
  "statusCode": 403,
  "error": "client_not_active",
  "message": "Client is not active. Please contact support."
}
```

## Tag Reading (Multi-Client)

When scanning a tag, the system needs to check if the user has access to the tag's client:

1. **Bypass RLS** for initial tag lookup (so we can find the tag regardless of client)
2. **Check access** after finding the tag - verify user has access to tag's client
3. **Return appropriate error** if user lacks access

```typescript
// In TagsService.findOneForInspection()
const tag = await prisma.tag.findUniqueOrThrow({ where: { externalId } });

// Check if user has access to this tag's client
const hasAccess = await this.checkUserAccessToClient(user.idpId, tag.client.externalId);
if (!hasAccess) {
  throw new ForbiddenException({
    message: 'You do not have access to this tag.',
    error: 'client_access_denied',
  });
}
```

## API Endpoints

### Client Access (`/client-access`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/client-access/me` | List my accessible clients |
| GET | `/client-access/persons/:personId` | List person's client access (admin) |
| POST | `/client-access/persons/:personId` | Grant client access (admin) |
| PATCH | `/client-access/:id` | Update access entry (admin) |
| DELETE | `/client-access/:id` | Revoke access (admin) |

### Database Roles (`/db-roles`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/db-roles` | List roles (optionally by clientId) |
| GET | `/db-roles/:id` | Get role with permissions |
| POST | `/db-roles` | Create role |
| PATCH | `/db-roles/:id` | Update role |
| DELETE | `/db-roles/:id` | Delete role (if not system) |
| POST | `/db-roles/:id/permissions` | Add permissions to role |
| DELETE | `/db-roles/:id/permissions/:permission` | Remove permission |

## Future Enhancements

1. **Permission Migration**: Move existing Keycloak groups to database roles
2. **UI Integration**: Client selector dropdown in the application
3. **Redis Pub/Sub**: Cross-instance cache invalidation

## Related Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database models |
| `src/common/types.ts` | `activeClientId` in ClsStore |
| `src/auth/auth.guard.ts` | Extracts `x-client-id` header |
| `src/clients/guards/active-client.guard.ts` | Validates client access |
| `src/clients/clients/clients.service.ts` | `validateClientAccess()` method |
| `src/clients/people/people.service.ts` | Builds PersonRepresentation with switching |
| `src/assets/tags/tags.service.ts` | Multi-client tag access check |
| `src/clients/client-access/` | Client access management API |
| `src/admin/db-roles/` | Database roles management API |
