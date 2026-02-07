import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ModuleRef } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { StatelessUserData } from 'src/auth/user.schema';
import { TCapability } from 'src/auth/utils/capabilities';
import { RoleScope } from 'src/auth/utils/scope';
import { PeopleService, UserConfigurationError } from './people.service';

describe('PeopleService', () => {
  let service: PeopleService;
  let mockPrismaService: any;
  let mockClsService: any;
  let mockCacheManager: any;

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
    mockCacheManager = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockClsService = {
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
        { provide: ClsService, useValue: mockClsService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
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
      mockClsService.get.mockReturnValue(user);

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
      mockClsService.get.mockReturnValue(user);

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

  describe('getPersonRepresentation', () => {
    describe('without client switching (primary client)', () => {
      it('should return PersonRepresentation for primary client', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return undefined;
          return undefined;
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
              clientId: 'primary-client-internal',
              siteId: 'primary-site-internal',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest.fn().mockResolvedValue({
              clientId: 'primary-client-internal',
              siteId: 'primary-site-internal',
              client: { externalId: 'primary-client-ext' },
              role: {
                scope: RoleScope.CLIENT,
                capabilities: ['manage-assets'],
              },
            }),
          },
          site: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
              subsites: [],
            }),
          },
        });

        const result = await service.getPersonRepresentation(user);

        expect(result).toEqual(
          expect.objectContaining({
            id: 'person-internal-id',
            clientId: 'primary-client-internal',
            siteId: 'primary-site-internal',
            scope: RoleScope.CLIENT,
            hasMultiClientScope: false,
            hasMultiSiteScope: true,
          }),
        );
      });

      it('should throw UserConfigurationError when user has no client access', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return undefined;
          return undefined;
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        });

        await expect(service.getPersonRepresentation(user)).rejects.toThrow(
          UserConfigurationError,
        );
      });
    });

    describe('with client switching (x-client-id header)', () => {
      it('should return PersonRepresentation for switched client', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return 'secondary-client-ext';
          return undefined;
        });

        // First call for primary access check
        const primaryAccessMock = jest.fn().mockResolvedValue({
          clientId: 'primary-client-internal',
          siteId: 'primary-site-internal',
          client: { externalId: 'primary-client-ext' },
          role: {
            scope: RoleScope.CLIENT,
            capabilities: ['manage-assets'],
          },
        });

        // Second call for switched access
        const switchedAccessMock = jest.fn().mockResolvedValue({
          personId: 'person-internal-id',
          clientId: 'secondary-client-internal',
          siteId: 'switched-site-internal',
          client: { id: 'secondary-client-internal' },
          site: { id: 'switched-site-internal' },
          role: {
            scope: RoleScope.SITE,
            capabilities: ['perform-inspections'],
          },
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
              clientId: 'primary-client-internal',
              siteId: 'primary-site-internal',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest
              .fn()
              // 1st call: getPrimaryClientAccess
              .mockImplementationOnce(() => primaryAccessMock())
              // 2nd call: getSwitchedClientContext
              .mockImplementation(() => switchedAccessMock()),
          },
          site: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'switched-site-internal',
              subsites: [],
            }),
          },
        });

        const result = await service.getPersonRepresentation(user);

        expect(result).toEqual(
          expect.objectContaining({
            id: 'person-internal-id',
            clientId: 'secondary-client-internal',
            siteId: 'switched-site-internal',
            scope: RoleScope.SITE,
            hasMultiClientScope: false,
            hasMultiSiteScope: false,
          }),
        );
      });

      it('should throw UserConfigurationError when user has no access to switched client', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return 'unauthorized-client-ext';
          return undefined;
        });

        // Primary access exists
        const primaryAccessMock = jest.fn().mockResolvedValue({
          clientId: 'primary-client-internal',
          siteId: 'primary-site-internal',
          client: { externalId: 'primary-client-ext' },
          role: {
            scope: RoleScope.CLIENT,
            capabilities: ['manage-assets'],
          },
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
              clientId: 'primary-client-internal',
              siteId: 'primary-site-internal',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest
              .fn()
              // 1st call: getPrimaryClientAccess
              .mockImplementationOnce(() => primaryAccessMock())
              // 2nd call: getSwitchedClientContext - returns null (no access)
              .mockResolvedValue(null),
          },
          site: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });

        await expect(service.getPersonRepresentation(user)).rejects.toThrow(
          UserConfigurationError,
        );
      });
    });

    describe('scope from role', () => {
      it('should return GLOBAL scope with multi-client and multi-site access', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return undefined;
          return undefined;
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
              clientId: 'client-internal',
              siteId: 'site-internal',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest.fn().mockResolvedValue({
              clientId: 'client-internal',
              siteId: 'site-internal',
              client: { externalId: 'client-ext' },
              role: {
                scope: RoleScope.GLOBAL,
                capabilities: ['manage-assets', 'manage-users'],
              },
            }),
          },
          site: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'site-internal',
              subsites: [],
            }),
          },
        });

        const result = await service.getPersonRepresentation(user);

        expect(result.scope).toBe(RoleScope.GLOBAL);
        expect(result.hasMultiClientScope).toBe(true);
        expect(result.hasMultiSiteScope).toBe(true);
      });

      it('should return CLIENT scope with multi-site but not multi-client access', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return undefined;
          return undefined;
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
              clientId: 'client-internal',
              siteId: 'site-internal',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest.fn().mockResolvedValue({
              clientId: 'client-internal',
              siteId: 'site-internal',
              client: { externalId: 'client-ext' },
              role: {
                scope: RoleScope.CLIENT,
                capabilities: ['manage-assets'],
              },
            }),
          },
          site: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'site-internal',
              subsites: [],
            }),
          },
        });

        const result = await service.getPersonRepresentation(user);

        expect(result.scope).toBe(RoleScope.CLIENT);
        expect(result.hasMultiClientScope).toBe(false);
        expect(result.hasMultiSiteScope).toBe(true);
      });

      it('should return SITE scope with neither multi-client nor multi-site access', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return undefined;
          return undefined;
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
              clientId: 'client-internal',
              siteId: 'site-internal',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest.fn().mockResolvedValue({
              clientId: 'client-internal',
              siteId: 'site-internal',
              client: { externalId: 'client-ext' },
              role: {
                scope: RoleScope.SITE,
                capabilities: ['perform-inspections'],
              },
            }),
          },
          site: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'site-internal',
              subsites: [],
            }),
          },
        });

        const result = await service.getPersonRepresentation(user);

        expect(result.scope).toBe(RoleScope.SITE);
        expect(result.hasMultiClientScope).toBe(false);
        expect(result.hasMultiSiteScope).toBe(false);
      });

      it('should return capabilities from role', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return undefined;
          return undefined;
        });

        const expectedCapabilities = [
          'manage-assets',
          'manage-users',
          'view-reports',
        ] as TCapability[];

        mockPrismaService.bypassRLS.mockReturnValue({
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
              clientId: 'client-internal',
              siteId: 'site-internal',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest.fn().mockResolvedValue({
              clientId: 'client-internal',
              siteId: 'site-internal',
              client: { externalId: 'client-ext' },
              role: {
                scope: RoleScope.CLIENT,
                capabilities: expectedCapabilities,
              },
            }),
          },
          site: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'site-internal',
              subsites: [],
            }),
          },
        });

        const result = await service.getPersonRepresentation(user);

        expect(result.capabilities).toEqual(expectedCapabilities);
      });
    });
  });
});
