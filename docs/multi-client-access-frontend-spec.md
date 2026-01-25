# Multi-Client Access: Frontend Implementation Spec

This document describes the API endpoints and usage patterns for the multi-client access feature, which allows users to access multiple clients with per-client role/site assignments.

---

## Overview

Users can now belong to multiple clients, each with a different role and site assignment. The system supports:

1. **Client Switching** - Users can switch between accessible clients via a header
2. **Client Access Management** - Admins can grant/revoke access to clients for users
3. **Database Roles** - Permissions are managed via roles stored in the database

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

## Database Roles Endpoints

Base path: `/db-roles`

**All endpoints require Super Admin authorization.**

### List Roles

```http
GET /db-roles
GET /db-roles?clientId=<client-uuid>
Authorization: Bearer <token>
```

**Query Parameters:**
- `clientId` (optional) - Filter roles by client

**Response:** `200 OK`
```json
[
  {
    "id": "role-uuid",
    "name": "Site Manager",
    "description": "Manage assets and inspections",
    "isSystem": true,
    "clientId": null,
    "createdOn": "2024-01-01T00:00:00Z",
    "permissions": [
      { "id": "perm-uuid", "permission": "visibility:client-sites" },
      { "id": "perm-uuid", "permission": "read:assets" },
      { "id": "perm-uuid", "permission": "create:inspections" }
    ],
    "_count": {
      "personClientAccess": 5
    }
  }
]
```

**Notes:**
- Roles with `clientId: null` are global roles (available to all clients)
- Roles with a `clientId` are client-specific
- `isSystem: true` roles cannot be deleted
- `_count.personClientAccess` shows how many users have this role assigned

### Get Single Role

```http
GET /db-roles/:id
Authorization: Bearer <token>
```

**Response:** `200 OK` - Same structure as list, plus `client` relation if applicable

### Create Role

```http
POST /db-roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Custom Inspector",
  "description": "Read-only access to inspections",
  "clientId": "client-uuid",
  "isSystem": false
}
```

**Fields:**
- `name` (required) - Role name, must be unique within client scope
- `description` (optional) - Human-readable description
- `clientId` (optional) - If omitted, creates a global role
- `isSystem` (optional, default: false) - System roles cannot be deleted

**Response:** `201 Created`

### Update Role

```http
PATCH /db-roles/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response:** `200 OK`

### Delete Role

```http
DELETE /db-roles/:id
Authorization: Bearer <token>
```

**Validations:**
- Cannot delete system roles (`isSystem: true`)
- Cannot delete roles assigned to users (`_count.personClientAccess > 0`)

**Response:** `204 No Content`

### Add Permissions to Role

```http
POST /db-roles/:id/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "permissions": [
    "read:assets",
    "create:inspections",
    "visibility:single-site"
  ]
}
```

**Notes:**
- Duplicate permissions are silently ignored
- Returns the full updated role with all permissions

**Response:** `200 OK`

### Remove Permission from Role

```http
DELETE /db-roles/:id/permissions/:permission
Authorization: Bearer <token>
```

**Example:** `DELETE /db-roles/abc123/permissions/read:assets`

**Response:** `204 No Content`

---

## Permission Strings

Permissions follow the format `{category}:{action}`.

### Visibility Permissions

Control data access scope. Each role should have exactly one visibility permission.

| Permission | Description |
|------------|-------------|
| `visibility:super-admin` | Full system access across all clients |
| `visibility:global` | Cross-client visibility |
| `visibility:client-sites` | All sites within assigned client |
| `visibility:site-group` | Grouped sites only |
| `visibility:single-site` | Single site only |
| `visibility:self` | Own records only |

### Action Permissions

Control what operations users can perform. Examples:

| Permission | Description |
|------------|-------------|
| `read:assets` | View assets |
| `create:assets` | Create new assets |
| `update:assets` | Modify assets |
| `delete:assets` | Remove assets |
| `read:inspections` | View inspections |
| `create:inspections` | Perform inspections |
| `read:alerts` | View alerts |
| `resolve:alerts` | Mark alerts as resolved |
| `program:tags` | Program NFC tags |
| `register:tags` | Register tags to assets |

---

## System Roles

The following system roles are seeded and cannot be deleted:

| Role | Visibility | Description |
|------|------------|-------------|
| Super Admin | `super-admin` | Full system access |
| Global Admin | `global` | Cross-client management |
| Client Admin | `client-sites` | Full client management |
| Site Manager | `client-sites` | Site-level management |
| Inspector | `single-site` | Perform inspections |
| Viewer | `single-site` | Read-only access |

---

## Frontend Implementation Notes

### Client Switcher Component

1. On app load, call `GET /client-access/me` to get accessible clients
2. Display a client picker if user has multiple entries
3. Store selected client's `externalId`
4. Include `x-client-id: <externalId>` header on all API requests when switched

### Permissions from Response

When `USE_DATABASE_PERMISSIONS` is enabled on the backend:
- Permissions come from the user's assigned role (via `PersonClientAccess`)
- The `PersonRepresentation` includes a `permissions` array
- Use these permissions for UI authorization (show/hide features)

### Admin UI for Access Management

1. **User Access Panel:**
   - List user's current client access entries
   - Add access: Select client → site → role
   - Edit access: Change site or role
   - Remove access: Revoke with confirmation

2. **Role Management Panel:**
   - List all roles (filter by client)
   - Create custom roles
   - Edit role name/description
   - Manage permissions (add/remove)
   - Show assignment count before delete

### Error Handling

| Error | Action |
|-------|--------|
| `403 client_access_denied` | Show "no access" message, offer to switch back |
| `403 client_not_active` | Show "client inactive" message |
| `403 site_not_active` | Show "site inactive" message |
| `400` on grant access | Show validation error (duplicate, invalid site) |
| `400` on delete role | Show "role in use" or "system role" message |

---

## Caching Considerations

The backend caches permission lookups for 1 hour. After modifying:
- Client access entries
- Role permissions

The changes take effect immediately for new sessions, but existing sessions may see stale data until cache expires or user re-authenticates.
