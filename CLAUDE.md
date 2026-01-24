# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shield API is a NestJS-based safety inspection management system built with TypeScript. It's a multi-tenant SaaS platform for tracking assets, managing inspections, generating alerts, and handling consumables with expiration dates.

## MCP Tools Configuration

### Serena

When using Serena MCP tools, always activate the project using the Docker path:

```
/workspace/shield-api
```

**Do NOT use the local macOS path** (`/Users/my-name/Projects/...`). Serena runs in a Docker container and requires the container path.

---

## Commands

```bash
# Development
npm run start:dev      # Start with auto-reload
npm run start:debug    # Start in debug mode with watch

# Build
npm run build          # Build the application

# Testing
npm test               # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run test:e2e       # Run end-to-end tests
npm test -- assets.service.spec.ts              # Run specific test file
npm test -- --testNamePattern="AssetsService"   # Run specific test suite

# Linting/Formatting
npm run lint           # ESLint with auto-fix
npm run format         # Prettier

# Database (Prisma)
npm run db:generate    # Generate Prisma client
npx prisma migrate dev # Create and apply migrations
npx prisma db seed     # Seed database
npx prisma studio      # Open database GUI

# Email Templates
npm run email:dev      # Start email template development server

# Sentry
npm run sentry:sourcemaps  # Upload sourcemaps to Sentry
```

## Code Generation

**Always use the Nest CLI to generate modules, services, controllers, and other elements.**

Structure convention: Each module gets its own directory in `src/`, but files within a module should be flat (not nested in subdirectories). Use `--flat` when generating elements into existing modules.

```bash
# Generate a new module (creates src/plans/plans.module.ts)
npx nest g module plans

# Generate into existing module with flat structure (note: module/name pattern)
npx nest g service plans/plans --flat      # Creates src/plans/plans.service.ts
npx nest g controller plans/plans --flat   # Creates src/plans/plans.controller.ts

# Other common generators (into their respective module directories)
npx nest g guard auth/auth --flat          # src/auth/auth.guard.ts
npx nest g middleware auth/logging --flat  # src/auth/logging.middleware.ts
npx nest g pipe plans/validation --flat    # src/plans/validation.pipe.ts
npx nest g interceptor plans/transform --flat
npx nest g filter common/http-exception --flat
npx nest g decorator auth/roles --flat

# Useful flags
--dry-run    # Preview without writing files
--skip-import # Don't auto-add to module
```

**Testing requirements:**
- **Never use `--no-spec`** - Always generate test files with new modules/services/controllers
- After generating new files, run `npm test` to verify the default tests pass
- If a generated spec file fails, fix it immediately before continuing

Available schematics: `module` (mo), `controller` (co), `service` (s), `guard` (gu), `middleware` (mi), `pipe` (pi), `interceptor` (itc), `filter` (f), `decorator` (d), `class` (cl), `interface` (itf), `resource` (res), `gateway` (ga), `resolver` (r)

### Controller Routing

Define base routes in the `@Controller()` decorator, not in individual endpoint decorators. Use relative paths in method decorators.

```typescript
// Good - base path in @Controller(), relative paths in methods
@Controller('plans/:planId/entries')
export class EntriesController {
  @Post()
  create(@Param('planId', ParseUUIDPipe) planId: string) {}

  @Get()
  findAll(@Param('planId', ParseUUIDPipe) planId: string) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {}

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string) {}

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {}
}

// Bad - repeating full paths in every decorator
@Controller()
export class EntriesController {
  @Post('plans/:planId/entries')
  create() {}

  @Get('plans/:planId/entries')
  findAll() {}

  @Get('entries/:id')
  findOne() {}
}
```

### DTO Validation

Most endpoints accepting a JSON request body should use DTO validation. Modules with CRUD endpoints should have a `dto` subdirectory containing Zod-based DTOs.

**Structure:** `src/<module>/dto/<name>.dto.ts`

**Pattern:**
```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export class CreatePlanDto extends createZodDto(createPlanSchema) {}
```

**Naming conventions:**
- File: `<name>.dto.ts` (e.g., `create-plan.dto.ts`, `update-plan.dto.ts`)
- Schema: `<name>Schema` (e.g., `createPlanSchema`, `updatePlanSchema`)
- Class: `<Name>Dto` (e.g., `CreatePlanDto`, `UpdatePlanDto`)

**Discriminated unions:** `createZodDto()` does not support `z.discriminatedUnion()` due to a TypeScript limitation (TS2509 - cannot extend a union type). See [nestjs-zod#41](https://github.com/BenLorantfy/nestjs-zod/issues/41).

Workaround - use a type alias and apply validation directly in the controller:
```typescript
// In DTO file
export const createEntrySchema = z.discriminatedUnion('category', [
  z.object({ category: z.literal('A'), fieldA: z.string() }),
  z.object({ category: z.literal('B'), fieldB: z.number() }),
]);
export type CreateEntryDto = z.infer<typeof createEntrySchema>;

// In controller
@Post()
create(@Body(new ZodValidationPipe(createEntrySchema)) dto: CreateEntryDto) {
  return this.service.create(dto);
}
```

**Query Parameter DTOs:** Use the same pattern for validating query parameters. Create a DTO with a Zod schema and use it with the `@Query()` decorator:
```typescript
// In DTO file (e.g., list-entries-query.dto.ts)
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const listEntriesQuerySchema = z.object({
  category: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export class ListEntriesQueryDto extends createZodDto(listEntriesQuerySchema) {}

// In controller
@Get()
findAll(@Query() query: ListEntriesQueryDto) {
  return this.service.findAll(query);
}
```

Note: Use `z.coerce.number()` for numeric query params since they arrive as strings.

**Passing query DTOs to services:** Pass the query DTO to the service's `findAll` method. The query parameter should be optional so the method can be called without filters:
```typescript
// In service
async findAll(planId: string, query?: FindEntriesQueryDto) {
  const prisma = await this.prisma.forUser();
  const where: Prisma.EntryWhereInput = { planId };

  if (query?.taskKey) {
    where.taskKey = query.taskKey;
  }

  return prisma.entry.findMany({ where });
}

// In controller (assumes @Controller('plans/:planId/entries'))
@Get()
findAll(
  @Param('planId', ParseUUIDPipe) planId: string,
  @Query() query: FindEntriesQueryDto,
) {
  return this.service.findAll(planId, query);
}
```

**Passing DTOs to Prisma:** Pass validated DTOs directly to `create` and `update` methods. The Zod schema ensures the data shape matches the database schema, so manual attribute mapping is unnecessary:
```typescript
// Good - pass DTO directly
async create(dto: CreatePlanDto) {
  const prisma = await this.prisma.forUser();
  return prisma.plan.create({ data: dto });
}

async update(id: string, dto: UpdatePlanDto) {
  const prisma = await this.prisma.forUser();
  return prisma.plan.update({ where: { id }, data: dto });
}

// Bad - manual mapping is superfluous
async create(dto: CreatePlanDto) {
  const prisma = await this.prisma.forUser();
  return prisma.plan.create({
    data: {
      name: dto.name,
      description: dto.description,
    },
  });
}
```

## Architecture

**NestJS API** with Prisma ORM targeting PostgreSQL with Row-Level Security (RLS).

### Multi-Tenancy & Security

The system implements Row Level Security (RLS) using PostgreSQL session variables:

- `app.current_client_id` - Current client context
- `app.current_site_id` - Current site context
- `app.current_person_id` - Current user context
- `app.allowed_site_ids` - Comma-separated list of accessible site IDs
- `app.current_user_visibility` - User visibility level
- `app.bypass_rls` - Set to 'on' for admin/cron operations

These are set via database defaults in Prisma models and enforced through RLS policies.

### RLS Authentication Pattern

RLS context is managed in `src/prisma/prisma.service.ts`. For authenticated queries, use the extended Prisma client:

```typescript
// Standard user context - applies RLS based on current user
const prisma = await this.prisma.forUser();
await prisma.asset.findMany();

// Bypass RLS for admin operations
const prisma = this.prisma.bypassRLS();
await prisma.asset.findMany();

// With explicit context
const prisma = await this.prisma.forContext('admin');
```

The `forUser()` method sets session variables before each query:
```sql
SELECT set_config('app.current_client_id', '<client_id>', TRUE);
SELECT set_config('app.current_site_id', '<site_id>', TRUE);
SELECT set_config('app.allowed_site_ids', '<site_ids>', TRUE);
SELECT set_config('app.current_person_id', '<person_id>', TRUE);
SELECT set_config('app.current_user_visibility', '<visibility>', TRUE);
```

Database schema is defined in `prisma/schema.prisma`. Migrations are in `prisma/migrations/`.

### Core Domain Models

- **Assets**: Physical items to be inspected (equipment, machinery)
- **Inspections**: Records of asset inspections with GPS tracking
- **InspectionRoutes**: Predefined paths for systematic inspections
- **Tags**: Physical NFC tags linked to assets
- **Alerts**: Generated from inspection responses based on criteria
- **Consumables**: Items with expiration dates and quantities, publicly known as "Supplies"
- **Products**: Catalog items that can become assets or consumables
- **ProductRequests**: Workflow for requesting new products

### Key Services

- **Authentication**: Keycloak integration via `@auth` decorators
- **Database**: Prisma ORM with PostgreSQL
- **Caching**: Redis for performance
- **Queues**: BullMQ for background jobs
- **Notifications**: Email via Resend, SMS via Telnyx
- **Media**: File handling with vault ownership system

### Module Structure

```
src/
├── assets/           - Core asset management (assets, inspections, alerts)
├── clients/          - Multi-tenant client/site/user management
├── products/         - Product catalog (manufacturers, categories, ANSI)
├── auth/             - Keycloak authentication
├── notifications/    - Email/SMS with React Email templates
├── legacy-migration/ - Migration tools from old system
├── m2m/              - Machine-to-machine API endpoints
└── stats/            - Compliance reporting
```

### Testing Conventions

- Unit tests: `*.spec.ts` files co-located with source
- E2E tests: `*.e2e-spec.ts` files in `/test/` directory
- Uses `@nestjs/testing` with standard NestJS dependency injection patterns
- Tests should mock external dependencies (Redis, Keycloak, database)

### Legacy System Integration

Models contain `legacy*Id` fields for migration mapping. The `/legacy-migration` module handles data migration from the previous system.

### API Design

- REST endpoints follow NestJS controller patterns
- DTOs with Zod validation for request/response
- Swagger/OpenAPI documentation
- WebSocket support for real-time features
- Machine-to-machine endpoints in `/m2m` for scanner integration
