// Common mock providers for testing

import { Provider } from '@nestjs/common';

// Mock PrismaService
export const mockPrismaService = {
  forContext: jest.fn().mockResolvedValue({
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productCategory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    manufacturer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ansiCategory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    asset: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    assetQuestion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    consumable: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    inspection: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    inspectionRoute: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    alert: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tag: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    client: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    site: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    person: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vaultOwnership: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    settingsBlock: {
      create: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  }),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Mock ClsService
export const mockClsService = {
  get: jest.fn(),
  set: jest.fn(),
  getId: jest.fn(),
  run: jest.fn(),
};

// Mock JwtService
export const mockJwtService = {
  sign: jest.fn(),
  signAsync: jest.fn(),
  verify: jest.fn(),
  verifyAsync: jest.fn(),
  decode: jest.fn(),
};

// Mock CacheManager
export const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
};

// Mock KeycloakService
export const mockKeycloakService = {
  findUsersByAttribute: jest.fn(),
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
};

// Mock NotificationsService
export const mockNotificationsService = {
  sendEmail: jest.fn(),
  sendSms: jest.fn(),
};

// Mock ApiConfigService
export const mockApiConfigService = {
  get: jest.fn(),
  getOrThrow: jest.fn(),
};

// Mock AuthService
export const mockAuthService = {
  validateJwtToken: jest.fn(),
  extractTokenFromRequest: jest.fn(),
};

// Mock Reflector
export const mockReflector = {
  get: jest.fn(),
  getAll: jest.fn(),
  getAllAndOverride: jest.fn(),
  getAllAndMerge: jest.fn(),
};

// Provider factory helpers
export const createMockProvider = (
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  token: string | symbol | Function,
  mock: unknown,
): Provider => ({
  provide: token,
  useValue: mock,
});

// Common mock providers array
export const commonMockProviders: Provider[] = [
  { provide: 'PrismaService', useValue: mockPrismaService },
  { provide: 'ClsService', useValue: mockClsService },
];
