# Shield API

A multi-tenant safety inspection management system built with NestJS, Prisma, and PostgreSQL. Shield API powers a SaaS platform for tracking assets, managing inspections, generating alerts, and handling consumables with expiration dates.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose

## Setup

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts **PostgreSQL** and **Redis** with default development credentials. The database `shield_api` is created automatically with user `shield_api` / password `asdf`.

**Keycloak:** Most developers connect to the staging instance at `https://auth.stg.fc-safety.com` rather than running Keycloak locally. A custom Keycloak image is available in the private repo [fc-safety/keycloak](https://github.com/fc-safety/keycloak) — see the commented-out service in `docker-compose.yml` if you need a local instance.

### 2. Configure and start the API

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env — the defaults work with docker compose + staging Keycloak

# Generate Prisma client (only needed on first setup or after git pull
# with schema changes — migrate dev below also regenerates the client)
npm run db:generate

# Run database migrations (creates tables and RLS policies)
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed

# Start the development server
npm run start:dev
```

The API starts at `http://localhost:3000`. OpenAPI docs are available at `/api-docs`.

### Database Notes

Prisma migrations enable **Row-Level Security (RLS)** with `FORCE ROW LEVEL SECURITY` on all tenant-scoped tables. This means even the table owner (the `shield_api` user) is subject to RLS policies. The application sets PostgreSQL session variables (e.g., `app.current_client_id`) before each query to control data visibility. See [Prisma Patterns](./docs/prisma-patterns.md) for details.

## Development

```bash
npm run start:dev      # Start with auto-reload
npm run start:debug    # Start in debug mode

npm test               # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run test:e2e       # Run end-to-end tests

npm run lint           # ESLint with auto-fix
npm run format         # Prettier

npm run email:dev      # React Email template development server
npx prisma studio      # Database GUI
```

## Architecture

- **NestJS** — Application framework with dependency injection
- **Prisma** — ORM with PostgreSQL and Row-Level Security (RLS)
- **Keycloak** — Identity provider (OAuth2/OIDC)
- **Redis** — Caching, pub/sub for real-time events, BullMQ job queues
- **Resend** — Transactional email (React Email templates)
- **Telnyx** — SMS notifications
- **Sentry** — Error tracking

## Documentation

Detailed documentation is available in the [`docs/`](./docs/) directory:

**Architecture & Patterns**
- [Authentication & Authorization](./docs/auth.md) — Keycloak, scopes, capabilities, policy decorators, CLS
- [Access Intent](./docs/access-intent.md) — `x-access-intent` header and RLS bypass behavior
- [Multi-Client Access](./docs/multi-client-access.md) — Multi-tenant access model and client switching
- [Prisma & Database Patterns](./docs/prisma-patterns.md) — RLS, `build()` vs `bypassRLS()`, transactions
- [Caching](./docs/caching.md) — Memory cache with request coalescing, Redis pub/sub
- [Error Handling](./docs/error-handling.md) — Exception filters, auth errors, Sentry
- [Testing](./docs/testing.md) — Jest setup, Prisma mocking, shared test utilities

**Domain Modules**
- [Assets](./docs/assets.md) — Assets, inspections, alerts, tags, consumables, routes, reports
- [Products](./docs/products.md) — Product catalog, manufacturers, categories, asset questions
- [Clients](./docs/clients.md) — Organizations, sites, members, invitations, access control
- [Stats](./docs/stats.md) — Compliance reporting
- [Settings](./docs/settings.md) — Global settings blocks

**Infrastructure**
- [Notifications](./docs/notifications.md) — BullMQ queues, email/SMS, React Email templates
- [Real-Time Events](./docs/events.md) — SSE streams via Redis pub/sub
- [M2M API](./docs/m2m.md) — Machine-to-machine endpoints for scanners
- [Media](./docs/media.md) — File vault ownership system
- [Legacy Migration](./docs/legacy-migration.md) — Data migration from previous system
- [Other Modules](./docs/other-modules.md) — Health, landing, support, admin

Developer conventions and code generation patterns are in [CLAUDE.md](./CLAUDE.md).
