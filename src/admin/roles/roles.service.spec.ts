import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;

  const mockKeycloakService = {
    client: {
      clients: {
        find: jest.fn().mockResolvedValue([{ id: 'client-uuid' }]),
        findRole: jest.fn(),
        listRoles: jest.fn().mockResolvedValue([]),
      },
      groups: {
        find: jest.fn().mockResolvedValue([]),
        createChildGroup: jest.fn(),
        update: jest.fn(),
        del: jest.fn(),
        listSubGroups: jest.fn(),
        addClientRoleMappings: jest.fn(),
        delClientRoleMappings: jest.fn(),
      },
      setConfig: jest.fn(),
      auth: jest.fn(),
    },
    getOrCreateManagedRolesGroup: jest
      .fn()
      .mockResolvedValue({ id: 'group-id' }),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-audience'),
  };

  const mockClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockRedisService = {
    getPublisher: jest.fn().mockReturnValue({
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
    }),
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
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: ClsService, useValue: mockClsService },
        { provide: RedisService, useValue: mockRedisService },
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
