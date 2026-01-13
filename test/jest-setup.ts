/**
 * Jest setup file for mocking Prisma client.
 *
 * This approach mocks only the runtime components while preserving all
 * type exports from the generated Prisma client. This means:
 * - When the schema changes, types automatically stay in sync
 * - No manual maintenance of type definitions in mock files
 * - Error classes are properly mocked for instanceof checks
 */

// Mock the Prisma client runtime - this is what has the actual implementation
jest.mock('@prisma/client/runtime/client', () => {
  // Create mock error classes that match Prisma's interface
  class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: Record<string, unknown>;
    clientVersion: string;

    constructor(
      message: string,
      {
        code,
        clientVersion,
        meta,
      }: {
        code: string;
        clientVersion: string;
        meta?: Record<string, unknown>;
      },
    ) {
      super(message);
      this.code = code;
      this.clientVersion = clientVersion;
      this.meta = meta;
      this.name = 'PrismaClientKnownRequestError';
    }
  }

  class PrismaClientUnknownRequestError extends Error {
    clientVersion: string;
    constructor(message: string, { clientVersion }: { clientVersion: string }) {
      super(message);
      this.clientVersion = clientVersion;
      this.name = 'PrismaClientUnknownRequestError';
    }
  }

  class PrismaClientRustPanicError extends Error {
    clientVersion: string;
    constructor(message: string, clientVersion: string) {
      super(message);
      this.clientVersion = clientVersion;
      this.name = 'PrismaClientRustPanicError';
    }
  }

  class PrismaClientInitializationError extends Error {
    clientVersion: string;
    errorCode?: string;
    constructor(message: string, clientVersion: string, errorCode?: string) {
      super(message);
      this.clientVersion = clientVersion;
      this.errorCode = errorCode;
      this.name = 'PrismaClientInitializationError';
    }
  }

  class PrismaClientValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PrismaClientValidationError';
    }
  }

  return {
    PrismaClientKnownRequestError,
    PrismaClientUnknownRequestError,
    PrismaClientRustPanicError,
    PrismaClientInitializationError,
    PrismaClientValidationError,
    // Stub for sql template tag
    sqltag: () => ({}),
    // Stub for typed query factory (used by generated SQL queries)
    makeTypedQueryFactory: (sql: string) => () => ({ sql, values: [] }),
    // DMMF is used for metadata
    DMMF: {},
    // Types namespace for runtime type utilities
    Types: {
      Result: {
        DefaultSelection: {},
      },
      Public: {
        PrismaPromise: Promise,
      },
      Extensions: {
        InternalArgs: {},
        DefaultArgs: {},
      },
    },
  };
});

// Mock the generated Prisma client module
jest.mock('src/generated/prisma/client', () => {
  // Import the actual enums - they have no runtime dependencies
  const enums = jest.requireActual('src/generated/prisma/enums');

  // Get the mocked runtime
  const runtime = jest.requireMock('@prisma/client/runtime/client');

  // Create a mock PrismaClient class
  class PrismaClient {
    $connect() {
      return Promise.resolve();
    }
    $disconnect() {
      return Promise.resolve();
    }
    $executeRaw() {
      return Promise.resolve(0);
    }
    $executeRawUnsafe() {
      return Promise.resolve(0);
    }
    $queryRaw() {
      return Promise.resolve([]);
    }
    $queryRawUnsafe() {
      return Promise.resolve([]);
    }
    $transaction(fn: unknown) {
      if (typeof fn === 'function') {
        return fn(this);
      }
      return Promise.resolve([]);
    }
  }

  // Create the Prisma namespace with error classes and utilities
  const Prisma = {
    PrismaClientKnownRequestError: runtime.PrismaClientKnownRequestError,
    PrismaClientUnknownRequestError: runtime.PrismaClientUnknownRequestError,
    PrismaClientRustPanicError: runtime.PrismaClientRustPanicError,
    PrismaClientInitializationError: runtime.PrismaClientInitializationError,
    PrismaClientValidationError: runtime.PrismaClientValidationError,
    // Common type utilities
    DbNull: Symbol('DbNull'),
    JsonNull: Symbol('JsonNull'),
    AnyNull: Symbol('AnyNull'),
    SortOrder: {
      asc: 'asc',
      desc: 'desc',
    },
    NullsOrder: {
      first: 'first',
      last: 'last',
    },
    QueryMode: {
      default: 'default',
      insensitive: 'insensitive',
    },
  };

  return {
    PrismaClient,
    Prisma,
    // Re-export all enums from the actual generated file
    ...enums,
    $Enums: enums,
  };
});

// Mock the generated SQL queries module
jest.mock('src/generated/prisma/sql', () => {
  // Create stub functions that return objects compatible with $queryRaw
  const createQueryStub = () => () => ({ sql: '', values: [] });

  return {
    getActiveAssets: createQueryStub(),
    getAssetsToRenewForDemoClient: createQueryStub(),
    getExpiredConsumables: createQueryStub(),
    getExpiringConsumables: createQueryStub(),
    getOverdueAssets: createQueryStub(),
    getRecentAlerts: createQueryStub(),
    getRecentInspections: createQueryStub(),
    getUnresolvedAlerts: createQueryStub(),
  };
});
