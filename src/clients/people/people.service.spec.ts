import { ModuleRef } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiClsService } from 'src/auth/api-cls.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { StatelessUserData } from 'src/auth/user.schema';
import { RoleScope } from 'src/auth/utils/scope';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { PeopleService } from './people.service';

describe('PeopleService', () => {
  let service: PeopleService;
  let mockPrismaService: any;
  let mockApiClsService: any;
  let mockMemoryCacheService: any;

  const mockKeycloakService = {
    events: {
      users: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    },
    findUserById: jest.fn(),
  };

  const createMockUser = (
    overrides: Partial<StatelessUserData> = {},
  ): StatelessUserData => ({
    idpId: 'keycloak-user-123',
    email: 'test@example.com',
    username: 'testuser',
    givenName: 'Test',
    familyName: 'User',
    ...overrides,
  });

  beforeEach(async () => {
    mockMemoryCacheService = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      del: jest.fn(),
      getOrSet: jest.fn(),
    };

    mockApiClsService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockPrismaService = {
      bypassRLS: jest.fn(),
    };

    const mockModuleRef = {
      get: jest.fn().mockReturnValue(mockPrismaService),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeopleService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: MemoryCacheService, useValue: mockMemoryCacheService },
        { provide: ModuleRef, useValue: mockModuleRef },
      ],
    }).compile();

    service = module.get<PeopleService>(PeopleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPersonBasicInfo', () => {
    it('should return basic info for user with client access', async () => {
      const user = createMockUser();
      mockApiClsService.get.mockReturnValue(user);

      mockPrismaService.bypassRLS.mockReturnValue({
        person: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'person-123',
            firstName: 'Test',
            lastName: 'User',
          }),
        },
        personClientAccess: {
          findMany: jest.fn().mockResolvedValue([
            {
              clientId: 'client-1',
              siteId: 'site-1',
              isPrimary: true,
              client: {
                id: 'client-1',
                name: 'Test Client',
                externalId: 'ext-client-1',
              },
              site: {
                id: 'site-1',
                name: 'Test Site',
              },
              role: {
                id: 'role-1',
                name: 'Admin',
                scope: RoleScope.CLIENT,
                capabilities: ['manage-assets'],
              },
            },
          ]),
        },
      });

      const result = await service.getPersonBasicInfo(user);

      expect(result.id).toBe('person-123');
      expect(result.idpId).toBe('keycloak-user-123');
      expect(result.clientAccess).toHaveLength(1);
      expect(result.clientAccess[0].clientName).toBe('Test Client');
    });

    it('should return null id for user without person record', async () => {
      const user = createMockUser();
      mockApiClsService.get.mockReturnValue(user);

      mockPrismaService.bypassRLS.mockReturnValue({
        person: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        personClientAccess: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      });

      const result = await service.getPersonBasicInfo(user);

      expect(result.id).toBeNull();
      expect(result.clientAccess).toEqual([]);
    });
  });
});
