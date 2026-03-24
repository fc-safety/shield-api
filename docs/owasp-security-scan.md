# OWASP Top 10 Security Scan Report

**Date:** 2026-03-24
**Codebase:** Shield API (NestJS + Prisma + PostgreSQL)

---

## Summary

| OWASP Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| A01: Broken Access Control | 1 | 3 | 3 | 1 |
| A02: Cryptographic Failures | 1 | 1 | 2 | 0 |
| A03: Injection | 1 | 0 | 1 | 3 |
| A04: Insecure Design | 0 | 1 | 1 | 0 |
| A05: Security Misconfiguration | 0 | 1 | 1 | 0 |
| A06: Vulnerable Components | 0 | 2 | 0 | 0 |
| A07: Auth Failures | 0 | 1 | 1 | 0 |
| A08: Integrity Failures | 0 | 0 | 2 | 0 |
| A09: Logging Failures | 0 | 1 | 3 | 0 |
| A10: SSRF | 0 | 0 | 0 | 0 |
| **Total** | **3** | **10** | **14** | **4** |

---

## A01: Broken Access Control

### CRITICAL — Missing RLS on SettingsBlock Table

**Location:** `src/settings/settings.service.ts`, `prisma/migrations/20250226170926_add_settings_block_model/migration.sql`

The `SettingsBlock` table has no Row-Level Security policies. The service uses raw Prisma calls (`this.prisma.settingsBlock.findUnique(...)`) without `build()` or `bypassRLS()`. Any authenticated user can potentially view or modify global system settings regardless of tenant or role.

**Remediation:** Create a migration enabling RLS on the `SettingsBlock` table. Update the service to use `this.prisma.build()` or explicit `bypassRLS()` with proper scope checks.

---

### HIGH — Missing ParseUUIDPipe on Controller Parameters

**Locations:**
- `src/assets/inspection-routes/inspection-routes.controller.ts` — `pointId` parameter on `findOnePoint` and `removePoint`
- `src/notifications/notifications.controller.ts` — `queueName` and `jobId` on `retryJob` and `removeJob`

Missing input validation allows arbitrary strings in ID parameters, enabling potential IDOR or queue manipulation.

**Remediation:** Add `ParseUUIDPipe` to all ID parameters. For queue operations, validate `queueName` against an allowlist.

---

### HIGH — Public Tag Endpoints Bypass Access Validation

**Location:** `src/assets/tags/tags.service.ts` (lines 83–150), `src/assets/inspections/inspections-public.service.ts`

The `findOneForInspection()` method uses `bypassRLS()` then validates access post-query. Unregistered tags (no `clientId`) skip all access checks. The `isValidTagId()` endpoint accepts arbitrary `id`/`extId` and queries with `bypassRLS()` without proving legitimate access.

**Remediation:** Add authentication boundaries or rate limiting on enumeration endpoints. Validate access before querying bypassed-RLS data.

---

### HIGH — Inconsistent RLS on Auth SigningKey Queries

**Location:** `src/auth/auth.service.ts` (lines 733+)

Uses `this.prisma.signingKey` directly without `build()` or `bypassRLS()`, inconsistent with the RLS pattern used elsewhere.

**Remediation:** Use explicit `bypassRLS()` (appropriate for system-level entities) to make the intent clear and consistent.

---

### MEDIUM — M2M bypassRLS() with User-Supplied Input

**Location:** `src/m2m/m2m.service.ts` (lines 65–94)

`getTagUrl()` accepts `legacyTagId` from the request and queries directly with `bypassRLS()`. While protected by API key auth, mixing user input with RLS bypass is a risky pattern.

---

### MEDIUM — Vault Ownership Key Enumeration

**Location:** `src/media/vault-ownerships/vault-ownerships.controller.ts` (line 34)

`findOneByKey()` accepts a wildcard `@Param('path')` and joins into an arbitrary key lookup without additional authorization.

---

### MEDIUM — Unvalidated Input on Public Query Endpoints

**Location:** `src/assets/inspections/inspections-public.controller.ts`

`isValidTagUrl(@Query('url') url: string)` and `isValidTagId(@Query('id') id, @Query('extId') extId)` accept raw query parameters without schema validation.

---

### LOW — Inconsistent Scope Decorator Placement

Some controllers apply `@CheckScope` at class level, others at method level. While functional, the inconsistency increases the risk of missed checks on new endpoints.

---

## A02: Cryptographic Failures

### CRITICAL — Plaintext Password in Email

**Location:** `src/clients/users/users.service.ts` (lines 207–220), `src/notifications/templates/manager_password_reset.tsx`

The password reset flow sends the new plaintext password via email. Email is inherently insecure—passwords will be stored in mail server logs and transit unencrypted.

**Remediation:** Replace with a password reset link. Use Keycloak's built-in `resetPasswordEmail` capability.

---

### HIGH — Webhook Secret Fails Open

**Location:** `src/auth/keycloak/keycloak.service.ts` (lines 237–249)

If `KEYCLOAK_WEBHOOK_SECRET` is empty, `verifyWebhookSignature()` returns `false` — but the `.env.example` ships with an empty value. If accidentally deployed without the secret, all webhooks are rejected (which is safe), but the failure mode should be explicit at startup.

**Remediation:** Validate that `KEYCLOAK_WEBHOOK_SECRET` is non-empty at startup in the Zod config schema.

---

### MEDIUM — M2M API Keys Stored/Compared as Plain Strings

**Location:** `src/m2m/m2m.controller.ts` (lines 10–19)

API keys are compared with simple `includes()` — no hashing, no rotation mechanism, no per-key revocation.

**Remediation:** Hash keys, support rotation, and add per-key rate limiting.

---

### MEDIUM — Signing Keys Cached Indefinitely Without Rotation

**Location:** `src/auth/auth.service.ts` (lines 733–755)

Signing keys are cached forever in memory with no rotation or expiration policy.

**Remediation:** Implement key rotation (e.g., 90-day cycle) and cache TTLs.

---

## A03: Injection

### CRITICAL — SQL Injection Risk via Metadata Key Concatenation

**Location:** `src/products/asset-questions/asset-questions.service.ts` (lines 410–423)

```typescript
const keyPairs = [
  ...Object.entries(assetMetadata ?? {}),
  ...Object.entries(productMetadata ?? {}),
].map(([k, v]) => `${k}:${v}`);  // String concatenation with untrusted values
```

Although the resulting array is passed to Prisma via parameterized `Prisma.sql`, the `k:v` concatenation itself merges user-controlled metadata keys and values into strings without sanitization.

**Remediation:** Validate/sanitize metadata keys against an allowlist pattern before concatenation.

---

### MEDIUM — Content-Disposition Header Injection

**Location:** `src/common/stream-utils.ts` (lines 24, 48), `src/assets/tags/tags.controller.ts` (lines 94, 107)

Filenames are interpolated into `Content-Disposition` headers. `dto.serialNumbers?.at(0)` comes from user input without CRLF sanitization, creating a potential header injection vector.

**Remediation:** Strip or escape `\r\n` and special characters from filenames. Use RFC 5987 encoding.

---

### LOW — Log Injection (Multiple Locations)

**Locations:**
- `src/prisma/prisma.service.ts:63` — raw query logged directly
- `src/auth/keycloak/keycloak-webhook.controller.ts:48` — unsanitized event type
- `src/legacy-migration/legacy-migration.gateway.ts:51` — user-generated client ID
- `src/clients/clients/clients.service.ts:734` — client name in warning

User-controlled data interpolated into log strings without sanitization. Could enable log poisoning or obfuscation of attacks.

**Remediation:** Use structured/parameterized logging.

---

## A04: Insecure Design

### HIGH — No Account Lockout Mechanism

No brute-force protection or account lockout logic exists in the Shield API. Authentication is delegated to Keycloak — if Keycloak lockout is misconfigured, accounts are vulnerable.

**Remediation:** Verify Keycloak brute-force detection is enabled. Consider adding application-level failed-attempt tracking.

---

### MEDIUM — Overly Permissive Global Rate Limit

**Location:** `src/app.module.ts` (lines 56–61)

Global `ThrottlerModule` allows 10,000 requests per minute. Only two endpoints have specific limits (invitations: 10/min, landing: 1/15s). Authentication and other sensitive endpoints have no specific throttling.

**Remediation:** Add per-endpoint rate limits for authentication, password reset, and data export endpoints.

---

## A05: Security Misconfiguration

### HIGH — Missing Security Headers (No Helmet)

**Location:** `src/main.ts`

No `helmet` middleware configured. Missing headers:
- `X-Frame-Options` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)

**Remediation:** `npm install helmet` and add `app.use(helmet())` in `main.ts`.

---

### MEDIUM — CORS Localhost Regex Accepts Any Port

**Location:** `src/main.ts` (lines 54–56)

```typescript
origin: [/http:\/\/localhost:\d+/, ...config.get('CORS_ALLOWED_ORIGINS')]
```

The regex `/http:\/\/localhost:\d+/` matches any localhost port in all environments, not just development.

**Remediation:** Conditionally include the localhost regex only when `NODE_ENV !== 'production'`.

---

## A06: Vulnerable and Outdated Components

### HIGH — Known Vulnerable Dependencies

`npm audit` reports 39 vulnerabilities. Notable:

| Package | Issue | Severity |
|---|---|---|
| `@keycloak/keycloak-admin-client` ≤26.5.5 | Authorization bypass via Admin API | High |
| `multer` ≤2.1.0 (via `@nestjs/platform-express`) | 3 DoS vulnerabilities (incomplete cleanup, resource exhaustion, uncontrolled recursion) | High |
| `socket.io-parser` | Unbounded binary attachments → memory exhaustion | High |
| `effect` (via Prisma 6.13+) | AsyncLocalStorage context contamination under concurrent load | High — **critical for multi-tenant RLS** |

**Remediation:** Run `npm audit fix`. Evaluate upgrading `@keycloak/keycloak-admin-client` to ≥26.5.6 and `multer` to ≥2.1.1. The `effect` library issue warrants load-testing RLS context isolation.

---

## A07: Identification and Authentication Failures

### HIGH — No Token Revocation Mechanism

No logout or token blacklist endpoint exists in Shield API. Compromised JWT tokens remain valid until their natural expiry (controlled by Keycloak).

**Remediation:** Implement a token revocation endpoint or short-lived tokens with refresh token rotation.

---

### MEDIUM — System Admin Ephemeral Access Without Audit

**Location:** `src/auth/auth.service.ts` (lines 213–226, 270–284)

Users in the `SYSTEM_ADMIN_EMAILS` list can grant themselves ephemeral access to any client. No audit logging exists for these elevations.

**Remediation:** Add audit logging for all ephemeral access grants. Consider requiring MFA for elevated operations.

---

## A08: Software and Data Integrity Failures

### MEDIUM — Webhook JSON Parsed Without Schema Validation

**Location:** `src/auth/keycloak/keycloak-webhook.controller.ts` (line 74)

```typescript
representation = JSON.parse(event.representation);
```

External JSON is parsed without Zod schema validation before use. While individual fields are checked afterward, the parsed object is not validated as a whole.

**Remediation:** Define a Zod schema for expected webhook payload and validate before processing.

---

### MEDIUM — CI/CD Hardcoded Database Credentials

**Location:** `.github/workflows/test.yml` (line 29)

```yaml
DATABASE_URL: postgresql://user:pass@localhost:5432/db
```

Test database credentials are hardcoded in the workflow file.

**Remediation:** Use GitHub Actions secrets or service container defaults.

---

## A09: Security Logging and Monitoring Failures

### HIGH — No Audit Logging for User/Role Management

**Locations:**
- `src/clients/users/users.service.ts` — `update()`, `addRole()`, `removeRole()`, `resetPassword()` have no audit logging
- `src/clients/members/members.service.ts` — no logger instance
- `src/clients/invitations/invitations.service.ts` — no audit trail for invitation creation/acceptance

These are the most security-sensitive operations in the application. An attacker could modify roles or reset passwords with no trace.

**Remediation:** Add structured audit logging for all user, role, and access management operations. Include actor ID, target entity, action, and timestamp.

---

### MEDIUM — No HTTP Request Logging Middleware

No request/response logging middleware in `main.ts`. No access logs showing which endpoints were called, by whom, or when.

---

### MEDIUM — No Failed Authentication Tracking

**Location:** `src/auth/auth.guard.ts`

Failed JWT validations are logged generically but without IP address, timestamp patterns, or repeated failure detection.

---

### MEDIUM — Logging Lacks Context

Logger instances don't include request ID, user ID, or client ID for event correlation. No structured (JSON) logging format for automated analysis.

---

## A10: Server-Side Request Forgery

**No SSRF vulnerabilities found.** The application does not accept user-supplied URLs for server-side fetching. External service communication uses SDK clients (Resend, Telnyx, Keycloak Admin) with pre-configured endpoints.

---

## Positive Security Practices

The codebase demonstrates several strong security patterns:

- **RLS at database layer** — Multi-tenant isolation enforced by PostgreSQL
- **HMAC-SHA256 with timing-safe comparison** — Used for tag signatures and webhook verification
- **Cryptographically secure random generation** — `crypto.randomInt()` for passwords, CUID2 for secrets
- **Zod DTO validation** — Input validation on most endpoints
- **Prisma parameterized queries** — SQL injection protection across the ORM layer
- **Sentry error filtering** — Prevents internal error details from leaking to clients
- **JWT validation with JWKS** — Proper OIDC token verification against Keycloak

---

## Prioritized Remediation Plan

### Immediate (Critical)
1. Enable RLS on `SettingsBlock` table
2. Replace plaintext password emails with reset links
3. Add input sanitization for metadata key concatenation in asset questions

### Short-term (High)
4. Install and configure `helmet` for security headers
5. Update vulnerable dependencies (`multer`, `@keycloak/keycloak-admin-client`)
6. Add audit logging for user/role management operations
7. Add `ParseUUIDPipe` to all unvalidated ID parameters
8. Load-test `effect` library AsyncLocalStorage with concurrent multi-tenant requests

### Medium-term
9. Implement token revocation/blacklisting
10. Hash M2M API keys and support rotation
11. Add per-endpoint rate limiting for sensitive operations
12. Add structured logging with request context
13. Validate webhook JSON payloads with Zod schemas
14. Sanitize `Content-Disposition` filenames
15. Restrict CORS localhost regex to development only
