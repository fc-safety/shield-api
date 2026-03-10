# Other Modules

Small utility modules that don't warrant their own documentation file.

## Health (`/health`)

Standard NestJS Terminus health checks.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Health check |
| POST | `/health/test-submit` | Authenticated | Echo test endpoint |

Checks: Keycloak JWKS endpoint reachability and database connectivity.

**Files:** `src/health/`

## Landing (`/landing`)

Public endpoints for the Shield marketing landing page.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/landing/get-started` | Public (throttled 1/15s) | Submit "get started" form |

Validates Cloudflare Turnstile CAPTCHA token and queues a lead notification email.

**Files:** `src/landing/`

## Support (`/support`)

Help Scout support widget integration.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/support/identify` | Authenticated | Get Help Scout Beacon payload |

Returns user identity (name, email, company) with HMAC-SHA256 signature for secure Help Scout widget authentication.

**Files:** `src/support/`

## Admin / Roles (`/roles`)

System-level role management. All endpoints require SYSTEM scope (`@CheckSystemAdmin()`).

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | — | Create role |
| GET | `/` | manage-users | List all roles |
| GET | `/capabilities` | manage-users | List available capabilities |
| GET | `/scopes` | manage-users | List available scopes |
| GET | `/notification-groups` | — | List notification groups |
| GET | `/:id` | manage-users | Get role by ID |
| PATCH | `/:id` | — | Update role |
| DELETE | `/:id` | — | Delete role (204) |
| POST | `/:id/update-notification-groups` | — | Assign notification groups to role (204) |

Roles are cached for 5 minutes (`ROLE_CACHE_TTL` in `src/admin/roles/roles.service.ts:26`).

**Files:** `src/admin/roles/`
