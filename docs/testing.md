# Testing

## Overview

Shield API uses Jest for unit and e2e testing, with `@nestjs/testing` for dependency injection. All external dependencies (Prisma, Redis, Keycloak, etc.) are mocked.

## Running Tests

```bash
npm test                                          # All unit tests
npm run test:watch                                # Watch mode
npm run test:cov                                  # With coverage
npm run test:e2e                                  # End-to-end tests
npm test -- assets.service.spec.ts                # Specific file
npm test -- --testNamePattern="AssetsService"      # Specific suite
```

## Test Structure

- **Unit tests**: `*.spec.ts` files co-located with their source files
- **E2E tests**: `test/*.e2e-spec.ts`
- **Mocks**: `test/__mocks__/` for module-level mocks
- **Setup**: `test/jest-setup.ts` — Global Prisma mocking
- **Utilities**: `test/test-utils.ts` — Shared mock providers

## Prisma Mocking Strategy

The global setup in `test/jest-setup.ts` mocks Prisma at three levels:

1. **`@prisma/client/runtime/client`** — Mocks error classes (`PrismaClientKnownRequestError`, etc.) so `instanceof` checks work in tests
2. **`src/generated/prisma/client`** — Provides a mock `PrismaClient` class and `Prisma` namespace, while preserving real enum values from `src/generated/prisma/enums`
3. **`src/generated/prisma/sql`** — Stubs for typed SQL queries (`$queryRaw` usage)

This approach means schema changes automatically sync types — no manual mock maintenance needed.

## Writing a Unit Test

Standard pattern for service tests:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  const mockPrismaService = {
    build: jest.fn().mockResolvedValue({
      myModel: {
        create: jest.fn(),
        findMany: jest.fn(),
        findManyForPage: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    }),
    bypassRLS: jest.fn().mockReturnValue({
      myModel: { findUnique: jest.fn() },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## Shared Mock Providers

`test/test-utils.ts` provides pre-built mocks for common dependencies:

| Mock | What It Covers |
|------|---------------|
| `mockPrismaService` | Full Prisma client with all model methods |
| `mockClsService` | CLS context (get/set) |
| `mockJwtService` | JWT sign/verify/decode |
| `mockCacheManager` | Cache get/set/del |
| `mockKeycloakService` | Keycloak user management |
| `mockNotificationsService` | Email and SMS |
| `mockApiConfigService` | Config values |
| `mockAuthService` | JWT validation |
| `mockReflector` | NestJS metadata reflector |

Use `createMockProvider(token, mock)` to create provider entries for the testing module.

## Module-Level Mocks

Located in `test/__mocks__/`:

| Mock | Purpose |
|------|---------|
| `@keycloak/keycloak-admin-client` | Keycloak admin SDK |
| `@paralleldrive/cuid2` | CUID generation |
| `p-retry` | Retry utility |
| `nanoid` | ID generation |
| `generated/prisma/sql` | Typed SQL queries |

## Key Conventions

- Every generated module/service/controller must include a spec file (never use `--no-spec`)
- After generating new files, run `npm test` to verify default tests pass
- Mock external dependencies — tests should not require a running database, Redis, or Keycloak
- The `build()` mock returns a resolved Promise (matching the async signature); `bypassRLS()` returns synchronously

## Key Files

- `test/jest-setup.ts` - Global Prisma mock setup
- `test/test-utils.ts` - Shared mock providers and helpers
- `test/__mocks__/` - Module-level mocks
- `test/jest-e2e.json` - E2E test configuration
- `test/app.e2e-spec.ts` - E2E test entry point
