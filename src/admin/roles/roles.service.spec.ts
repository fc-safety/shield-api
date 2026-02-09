import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiClsService } from 'src/auth/api-cls.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;

  const mockApiClsService = {
    get: jest.fn(),
    set: jest.fn(),
    requireAccessGrant: jest.fn(),
  };

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({
      role: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      rolePermission: {
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        delete: jest.fn(),
      },
      client: {
        findUnique: jest.fn(),
      },
    }),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
