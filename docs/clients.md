# Clients Module

The clients module (`src/clients/`) manages multi-tenant organization structure: clients (tenants), sites, members, invitations, and access control.

See also: [multi-client-access.md](./multi-client-access.md) and [multi-client-access-frontend-spec.md](./multi-client-access-frontend-spec.md) for the multi-client access feature.

## Sub-Modules

### Clients (`/clients`)

Top-level tenant organizations. The entire controller requires SYSTEM scope (`@CheckScope('SYSTEM')`), except where overridden with `@CheckIsAuthenticated()`.

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| POST | `/` | SYSTEM | Create client |
| GET | `/` | SYSTEM | List all clients |
| GET | `/my-organization` | Authenticated | Current user's organization |
| GET | `/:id` | SYSTEM | Client with sites, members, assets, roles |
| PATCH | `/:id` | SYSTEM | Update client |
| DELETE | `/:id` | SYSTEM | Delete client |
| POST | `/:id/duplicate-demo` | SYSTEM | Clone demo client |
| POST | `/clear-demo-inspections` | Authenticated | Clear demo data |
| POST | `/generate-demo-inspections` | Authenticated | Generate realistic demo data |
| POST | `/renew-noncompliant-demo-assets` | Authenticated | Refresh demo compliance |

Demo operations use 60-second transaction timeouts and generate realistic question responses.

### Sites (`/sites`)

Physical locations within a client. Sites can have sub-sites (up to 3 levels deep).

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | manage-users | Create site |
| GET | `/` | — | List sites |
| GET | `/:id` | — | Get site |
| PATCH | `/:id` | manage-users | Update |
| DELETE | `/:id` | manage-users | Delete |

Requires CLIENT scope. Sites have addresses and an `active` flag.

### Members (`/members`)

People with access to a specific client. Manages role assignments within a client context.

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| GET | `/` | — | List members with roles |
| GET | `/:id` | — | Member with access details |
| POST | `/invite` | manage-users | Direct-add member |
| POST | `/:id/reset-password-email` | manage-users | Send password reset |
| POST | `/:id/roles` | manage-users | Add role |
| DELETE | `/:id` | manage-users | Remove member |
| DELETE | `/:id/roles` | manage-users | Remove role |

Role changes invalidate access grant caches and wrap primary-role checks in transactions.

### Users (`/users`)

System-level user management (cross-client). Requires SYSTEM scope.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all users |
| GET | `/generate-password` | Generate random password |
| GET | `/:id` | Get user |
| PATCH | `/:id` | Update user |
| POST | `/:id/reset-password` | Reset with new password |
| POST | `/:id/send-reset-password-email` | Send reset email |
| POST | `/:id/roles` | Add role (cross-client) |
| DELETE | `/:id/roles` | Remove role (cross-client) |

### Invitations (`/invitations`)

Email-based invitation workflow for onboarding new members.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | manage-users | Bulk create invitations |
| GET | `/` | manage-users | List invitations |
| GET | `/validate/:code` | Public (throttled) | Validate invitation code |
| GET | `/:id` | manage-users | Get invitation |
| POST | `/:id/resend` | manage-users | Resend email |
| POST | `/:code/accept` | Authenticated | Accept invitation |
| DELETE | `/:id` | manage-users | Revoke invitation |

**Key behaviors:**
- Bulk creation for inviting multiple people at once
- Public code validation throttled to 10 requests/minute
- Accepting uses `@SkipAccessGrantValidation()` since the user doesn't have access yet
- Email sent via React Email template through notifications queue

### Client Access (`/client-access`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Current user's accessible clients |

## Key Files

- `src/clients/clients/` — Client CRUD, demo operations
- `src/clients/sites/` — Site CRUD
- `src/clients/members/` — Member management, role assignments
- `src/clients/users/` — System-level user management
- `src/clients/invitations/` — Invitation workflow
- `src/clients/client-access/` — User's client list
