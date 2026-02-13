# Multi-Client Access: Frontend Implementation Spec

This document describes the API endpoints and usage patterns for the multi-client access feature, which allows users to access multiple clients with per-client role/site assignments.

---

## Overview

Users can now belong to multiple clients, each with a different role and site assignment. The system supports:

1. **Client Switching** - Users can switch between accessible clients via a header
2. **Client Access Management** - Admins can grant/revoke access to clients for users
3. **Roles & Permissions** - Permissions are managed via roles (supports both Keycloak and database modes via `USE_DATABASE_PERMISSIONS` flag)

---

## Client Switching

### How It Works

To access a different client than your primary (JWT-assigned) client, include the `x-client-id` header in your request:

```http
GET /assets
Authorization: Bearer <token>
x-client-id: <client-external-id>
```

**Behavior:**
- If `x-client-id` matches your primary client → no switching, uses JWT context
- If `x-client-id` differs → validates you have access via `PersonClientAccess` table
- If no access → returns `403 Forbidden`

### Error Response

```json
{
  "message": "You do not have access to the requested client.",
  "error": "client_access_denied",
  "statusCode": 403
}
```

### Notes

- The `x-client-id` value is the **external ID** of the client (not the internal UUID)
- When switching clients, your permissions come from the role assigned in your `PersonClientAccess` record for that client
- Your assigned site for the switched client may differ from your primary site

---

## Current User Endpoint

### Get Current User

Returns the authenticated user's identity and permissions. This combines JWT token data with database-derived role/permissions.

```http
GET /auth/me
Authorization: Bearer <token>
x-client-id: <client-external-id>  (optional)
```

**Response:** `200 OK`
```json
{
  "idpId": "keycloak-user-uuid",
  "email": "user@example.com",
  "username": "jsmith",
  "name": "John Smith",
  "givenName": "John",
  "familyName": "Smith",
  "picture": "https://example.com/avatar.jpg",
  "personId": "person-uuid",
  "clientId": "client-uuid",
  "siteId": "site-uuid",
  "scope": "CLIENT",
  "capabilities": ["read-assets", "write-assets", "read-inspections", "create-inspections"],
  "hasMultiClientScope": false,
  "hasMultiSiteScope": true
}
```

**Field Descriptions:**

| Field | Source | Description |
|-------|--------|-------------|
| `idpId` | JWT | Keycloak user ID |
| `email` | JWT | User's email address |
| `username` | JWT | Keycloak username |
| `name` | JWT | Full display name |
| `givenName` | JWT | First name |
| `familyName` | JWT | Last name |
| `picture` | JWT | Avatar URL (if set) |
| `personId` | Database | Internal Person record ID |
| `clientId` | Database | Active client UUID (reflects `x-client-id` if switching) |
| `siteId` | Database | Active site UUID for current client context |
| `scope` | Database | Role scope: `SELF`, `SITE`, `CLIENT`, `GLOBAL`, or `SYSTEM` |
| `capabilities` | Database | Array of capability strings the user has |
| `hasMultiClientScope` | Computed | `true` if scope is `GLOBAL` or `SYSTEM` |
| `hasMultiSiteScope` | Computed | `true` if scope is `CLIENT` or higher |

**Usage:**

Call this endpoint after authentication to:
1. Get user identity info for display (name, email, avatar)
2. Get the user's current permissions/capabilities for UI authorization
3. Determine if the user can access multiple clients or sites

When using the `x-client-id` header, the response reflects the switched client's context (clientId, siteId, scope, capabilities).

---

## Client Access Endpoints

Base path: `/client-access`

### Get My Accessible Clients

Returns all clients the current user can access (including their primary client if they have a `PersonClientAccess` record for it).

```http
GET /client-access/me
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "cuid",
    "personId": "person-uuid",
    "clientId": "client-uuid",
    "siteId": "site-uuid",
    "roleId": "role-uuid",
    "isPrimary": true,
    "createdOn": "2024-01-15T10:00:00Z",
    "client": {
      "id": "client-uuid",
      "externalId": "abc123",
      "name": "Acme Corporation"
    },
    "site": {
      "id": "site-uuid",
      "externalId": "site-abc",
      "name": "Main Office"
    },
    "role": {
      "id": "role-uuid",
      "name": "Site Manager",
      "description": "Manage assets and inspections for assigned sites"
    }
  }
]
```

### Get Person's Client Access (Admin)

```http
GET /client-access/persons/:personId
Authorization: Bearer <token>
```

**Authorization:** Super Admin only

**Response:** Same structure as above

### Grant Client Access (Admin)

```http
POST /client-access/persons/:personId
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": "client-uuid",
  "siteId": "site-uuid",
  "roleId": "role-uuid"
}
```

**Authorization:** Super Admin only

**Validations:**
- Person must exist
- Client must exist
- Site must exist and belong to the specified client
- Role must exist
- Person cannot already have access to this client

**Response:** `201 Created` - Returns the new access entry

### Update Client Access (Admin)

```http
PATCH /client-access/:accessId
Authorization: Bearer <token>
Content-Type: application/json

{
  "siteId": "new-site-uuid",
  "roleId": "new-role-uuid"
}
```

**Authorization:** Super Admin only

Both fields are optional. If `siteId` is provided, the site must belong to the same client.

**Response:** `200 OK` - Returns the updated access entry

### Revoke Client Access (Admin)

```http
DELETE /client-access/:accessId
Authorization: Bearer <token>
```

**Authorization:** Super Admin only

**Response:** `204 No Content`

---

## Roles Endpoints

Base path: `/roles`

**All endpoints require Super Admin authorization** (except `GET /roles`, `GET /roles/:id`, `GET /roles/capabilities`, and `GET /roles/scopes` which also allow users with the `manage-users` capability).

### List Roles

```http
GET /roles
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "role-uuid",
    "groupId": "role-uuid",
    "name": "Site Manager",
    "description": "Manage assets and inspections",
    "scope": "CLIENT",
    "capabilities": ["perform-inspections", "manage-assets", "resolve-alerts", "view-reports"],
    "notificationGroups": ["alerts", "inspections"],
    "createdOn": "2024-01-01T00:00:00Z",
    "updatedOn": "2024-01-15T10:00:00Z",
    "clientAssignable": true,
    "clientId": null
  }
]
```

**Notes:**
- `clientAssignable: true` roles can be assigned by client admins
- `clientAssignable: false` roles are only visible/assignable by super admins
- Roles can be scoped to a specific client via `clientId` field

### Get Single Role

```http
GET /roles/:id
Authorization: Bearer <token>
```

**Response:** `200 OK` - Same structure as list

### Get Available Capabilities

```http
GET /roles/capabilities
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "name": "perform-inspections",
    "label": "Perform Inspections",
    "description": "Read tags, assets, and questions; create inspection records"
  },
  {
    "name": "manage-assets",
    "label": "Manage Assets",
    "description": "Create, edit, and delete assets, consumables, and tags"
  }
]
```

### Get Available Scopes

```http
GET /roles/scopes
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "name": "SYSTEM",
    "label": "System",
    "description": "Full system access for internal operations"
  },
  {
    "name": "GLOBAL",
    "label": "Global (All Clients)",
    "description": "Access to all clients and all data"
  },
  {
    "name": "CLIENT",
    "label": "Client (All Sites)",
    "description": "Access to all sites within the assigned client"
  },
  {
    "name": "SITE_GROUP",
    "label": "Site Group",
    "description": "Access to a specific group of sites"
  },
  {
    "name": "SITE",
    "label": "Single Site",
    "description": "Access limited to a single site"
  },
  {
    "name": "SELF",
    "label": "Self Only",
    "description": "Access limited to own records only"
  }
]
```

### Get Notification Groups

```http
GET /roles/notification-groups
Authorization: Bearer <token>
```

**Response:** `200 OK` - Array of notification group objects

### Create Role

```http
POST /roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Custom Inspector",
  "description": "Inspection and reporting access",
  "scope": "SITE",
  "capabilities": ["perform-inspections", "view-reports"],
  "clientAssignable": true,
  "notificationGroups": ["alerts"],
  "clientId": "client-uuid"
}
```

**Fields:**
- `name` (required) - Role name, must be unique
- `description` (optional) - Human-readable description
- `scope` (optional, default: `SITE`) - Data visibility scope
- `capabilities` (optional, default: `[]`) - Array of capability strings
- `clientAssignable` (optional, default: `false`) - Can client admins assign this role?
- `notificationGroups` (optional) - Array of notification group IDs
- `clientId` (optional) - Scope role to a specific client

**Response:** `201 Created`

### Update Role

```http
PATCH /roles/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "scope": "CLIENT",
  "capabilities": ["perform-inspections", "manage-assets", "view-reports"],
  "clientAssignable": false,
  "notificationGroups": ["alerts", "inspections"]
}
```

**Response:** `200 OK`

### Delete Role

```http
DELETE /roles/:id
Authorization: Bearer <token>
```

**Validations:**
- Cannot delete system roles
- Cannot delete roles assigned to users

**Response:** `204 No Content`

### Update Notification Groups

```http
POST /roles/:id/update-notification-groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "notificationGroupIds": ["alerts", "inspections"]
}
```

**Response:** `204 No Content`

---

## Scope

Scope controls **how much data** a user can see. Each role has exactly one scope.

| Scope | Description |
|-------|-------------|
| `SYSTEM` | Full system access (FC Safety internal operations) |
| `GLOBAL` | Access to all clients and all data |
| `CLIENT` | Access to all sites within the assigned client |
| `SITE_GROUP` | Access to a specific group of sites |
| `SITE` | Access limited to a single site |
| `SELF` | Access limited to own records only |

**Scope Hierarchy** (most to least permissive): `SYSTEM` > `GLOBAL` > `CLIENT` > `SITE_GROUP` > `SITE` > `SELF`

---

## Capabilities

Capabilities control **what actions** a user can perform. Roles can have multiple capabilities.

| Capability | Label | Description |
|------------|-------|-------------|
| `perform-inspections` | Perform Inspections | Read tags, assets, and questions; create inspection records |
| `submit-requests` | Submit Requests | Create product and supply requests |
| `manage-assets` | Manage Assets | Create, edit, and delete assets, consumables, and tags |
| `manage-routes` | Manage Inspection Routes | Create and edit inspection routes and schedules |
| `resolve-alerts` | Resolve Alerts | Review and resolve alerts from failed inspections |
| `view-reports` | View Reports | Access compliance reports and statistics |
| `manage-users` | Manage Users | Create users, assign roles, and send invitations |
| `configure-products` | Configure Products | Manage product catalog, categories, and questions |
| `approve-requests` | Approve Requests | Approve or reject product and supply requests |
| `program-tags` | Program Tags | Generate tag URLs and program NFC tags (global resource) |

**Design Philosophy:**
- Capabilities are high-level bundles of related operations
- Unlike CRUD-style permissions (`read:assets`, `create:assets`), capabilities represent what a user can *do*
- This simplifies role management for administrators

---

## System Roles

The following system roles are seeded and cannot be deleted:

| Role | Scope | Capabilities | Client Assignable |
|------|-------|--------------|-------------------|
| Super Admin | `SYSTEM` | All capabilities | No |
| Client Admin | `CLIENT` | perform-inspections, submit-requests, manage-assets, manage-routes, resolve-alerts, view-reports, manage-users, approve-requests, program-tags | Yes |
| Site Manager | `CLIENT` | perform-inspections, submit-requests, manage-assets, manage-routes, resolve-alerts, view-reports, program-tags | Yes |
| Inspector | `SITE` | perform-inspections, submit-requests | Yes |
| Viewer | `SITE` | view-reports | Yes |
| Product Manager | `GLOBAL` | configure-products | No |
| Tag Programmer | `GLOBAL` | program-tags | No |

**Notes:**
- "Client Assignable" roles can be assigned by client admins to their users
- Roles with `GLOBAL` or `SYSTEM` scope can only be assigned by Super Admins

---

## Frontend Implementation Notes

### Initial App Load

1. After authentication, call `GET /auth/me` to get user identity and permissions
2. Store user info for display (name, email, avatar)
3. Store capabilities for UI authorization (show/hide features based on permissions)
4. Check `hasMultiClientScope` and/or call `GET /client-access/me` to determine if client switching is available

### Client Switcher Component

1. On app load, call `GET /client-access/me` to get accessible clients
2. Display a client picker if user has multiple entries
3. Store selected client's `externalId`
4. Include `x-client-id: <externalId>` header on all API requests when switched
5. After switching, call `GET /auth/me` again to refresh permissions for the new client context

### Permissions from Response

The `GET /auth/me` endpoint returns the user's capabilities based on their role:
- `capabilities` array contains permission strings like `read-assets`, `create-inspections`
- `scope` indicates visibility level: `SELF`, `SITE`, `CLIENT`, `GLOBAL`, `SYSTEM`
- Use these for UI authorization (show/hide features, enable/disable actions)

### Admin UI for Access Management

1. **User Access Panel:**
   - List user's current client access entries (`GET /client-access/persons/:personId`)
   - Add access: Select client → site → role (`POST /client-access/persons/:personId`)
   - Edit access: Change site or role (`PATCH /client-access/:id`)
   - Remove access: Revoke with confirmation (`DELETE /client-access/:id`)

2. **Role Management Panel:**
   - List all roles (`GET /roles`)
   - Get available capabilities and scopes (`GET /roles/capabilities`, `GET /roles/scopes`)
   - Create custom roles with scope and capabilities (`POST /roles`)
   - Edit role including scope/capabilities (`PATCH /roles/:id`)
   - Manage notification groups (`POST /roles/:id/update-notification-groups`)
   - Delete roles (`DELETE /roles/:id`) - show warning if role is assigned to users

3. **Role Editor UI:**
   - **Scope selector**: Dropdown with scope options (from `GET /roles/scopes`)
   - **Capabilities checkboxes**: Multi-select from available capabilities (from `GET /roles/capabilities`)
   - Show labels and descriptions for user-friendly display
   - Warn if granting `GLOBAL`/`SYSTEM` scope to a client-assignable role

### Error Handling

| Error | Action |
|-------|--------|
| `403 client_access_denied` | Show "no access" message, offer to switch back |
| `403 client_not_active` | Show "client inactive" message |
| `403 site_not_active` | Show "site inactive" message |
| `400` on grant access | Show validation error (duplicate, invalid site) |
| `400` on delete role | Show "role in use" or "system role" message |
| `400` on create/update role | Show validation error for invalid scope or capabilities |

---

## Caching Considerations

The backend caches permission lookups for 1 hour. After modifying:
- Client access entries
- Role permissions

The changes take effect immediately for new sessions, but existing sessions may see stale data until cache expires or user re-authenticates.
