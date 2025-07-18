# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shield API is a NestJS-based safety inspection management system built with TypeScript. It's a multi-tenant SaaS platform for tracking assets, managing inspections, generating alerts, and handling consumables with expiration dates.

## Development Commands

### Start Development
- `npm run start:dev` - Start with auto-reload
- `npm run start:debug` - Start in debug mode with watch

### Build & Quality
- `npm run build` - Build the application
- `npm run lint` - Lint and fix TypeScript files
- `npm run format` - Format files with Prettier

### Testing
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests
- `npm test -- assets.service.spec.ts` - Run specific test file
- `npm test -- --testNamePattern="AssetsService"` - Run specific test suite

### Database (Prisma)
- `npm run db:generate` - Generate Prisma client
- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma db seed` - Seed database
- `npx prisma studio` - Open database GUI

### Email Templates
- `npm run email:dev` - Start email template development server

## Architecture

### Multi-Tenancy & Security
The system implements Row Level Security (RLS) using PostgreSQL session variables:
- `app.current_client_id` - Current client context
- `app.current_site_id` - Current site context  
- `app.current_person_id` - Current user context

These are set via database defaults in Prisma models and enforced through RLS policies.

### Core Domain Models
- **Assets**: Physical items to be inspected (equipment, machinery)
- **Inspections**: Records of asset inspections with GPS tracking
- **InspectionRoutes**: Predefined paths for systematic inspections
- **Tags**: Physical RFID/NFC tags linked to assets
- **Alerts**: Generated from inspection responses based on criteria
- **Consumables**: Items with expiration dates and quantities
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