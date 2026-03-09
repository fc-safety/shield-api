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

## Admin / Roles (`/admin/roles`)

System-level role management.

**Files:** `src/admin/roles/`
