import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ModuleRef } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { StatelessUser } from 'src/auth/user.schema';
import { PrismaService } from 'src/prisma/prisma.service';
import { PeopleService, UserConfigurationError } from './people.service';

describe('PeopleService', () => {
  let service: PeopleService;
  let mockPrismaService: any;
  let mockClsService: jest.Mocked<Partial<ClsService>>;
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

  const createMockUser = (overrides: Partial<StatelessUser> = {}) =>
    ({
      idpId: 'keycloak-user-123',
      email: 'test@example.com',
      username: 'testuser',
      givenName: 'Test',
      familyName: 'User',
      clientId: 'primary-client-ext',
      siteId: 'primary-site-ext',
      visibility: 'client-sites' as const,
      permissions: ['visibility:client-sites', 'read:assets'],
      ...overrides,
    }) as StatelessUser;

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

  describe('getPersonRepresentation', () => {
    describe('without client switching (primary client)', () => {
      it('should return PersonRepresentation for primary client', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return undefined;
          return undefined;
        });

        // Mock client lookup
        mockPrismaService.bypassRLS.mockReturnValue({
          client: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-client-internal',
            }),
          },
          site: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
              subsites: [],
            }),
          },
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
        });

        const result = await service.getPersonRepresentation(user);

        expect(result).toEqual(
          expect.objectContaining({
            id: 'person-internal-id',
            clientId: 'primary-client-internal',
            siteId: 'primary-site-internal',
            visibility: 'client-sites',
            hasMultiClientVisibility: false,
            hasMultiSiteVisibility: true,
          }),
        );
      });

      it('should create person if not exists', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return undefined;
          return undefined;
        });

        const mockCreate = jest.fn().mockResolvedValue({
          id: 'new-person-id',
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          client: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-client-internal',
            }),
          },
          site: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
              subsites: [],
            }),
          },
          person: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: mockCreate,
          },
        });

        const result = await service.getPersonRepresentation(user);

        expect(result.id).toBe('new-person-id');
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              idpId: 'keycloak-user-123',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
            }),
          }),
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

        // Mock for primary client lookups (ensurePersonExists)
        const primaryMocks = {
          client: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-client-internal',
            }),
          },
          site: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'switched-site-internal',
              subsites: [
                {
                  id: 'subsite-1',
                  subsites: [],
                },
              ],
            }),
          },
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest.fn().mockResolvedValue({
              personId: 'person-internal-id',
              clientId: 'secondary-client-internal',
              siteId: 'switched-site-internal',
              client: { id: 'secondary-client-internal' },
              site: { id: 'switched-site-internal' },
              role: {
                permissions: [
                  { permission: 'visibility:single-site' },
                  { permission: 'read:assets' },
                ],
              },
            }),
          },
        };

        mockPrismaService.bypassRLS.mockReturnValue(primaryMocks);

        const result = await service.getPersonRepresentation(user);

        expect(result).toEqual(
          expect.objectContaining({
            id: 'person-internal-id',
            clientId: 'secondary-client-internal',
            siteId: 'switched-site-internal',
            visibility: 'single-site',
            hasMultiClientVisibility: false,
            hasMultiSiteVisibility: false,
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

        mockPrismaService.bypassRLS.mockReturnValue({
          client: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-client-internal',
            }),
          },
          site: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
              subsites: [],
            }),
          },
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
            update: jest.fn().mockResolvedValue({
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

      it('should not switch when activeClientId matches primary client', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          // Same as user.clientId
          if (key === 'activeClientId') return 'primary-client-ext';
          return undefined;
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          client: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-client-internal',
            }),
          },
          site: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
              subsites: [],
            }),
          },
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest.fn(),
          },
        });

        const result = await service.getPersonRepresentation(user);

        // Should use primary client, not query PersonClientAccess
        expect(result.clientId).toBe('primary-client-internal');
        expect(result.visibility).toBe('client-sites');
      });

      it('should include subsites in allowedSiteIdsStr for switched client', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return 'secondary-client-ext';
          return undefined;
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          client: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-client-internal',
            }),
          },
          site: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'switched-site-internal',
              subsites: [
                {
                  id: 'subsite-1',
                  subsites: [
                    {
                      id: 'subsite-1-1',
                      subsites: [{ id: 'subsite-1-1-1' }],
                    },
                  ],
                },
                {
                  id: 'subsite-2',
                  subsites: [],
                },
              ],
            }),
          },
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest.fn().mockResolvedValue({
              personId: 'person-internal-id',
              clientId: 'secondary-client-internal',
              siteId: 'switched-site-internal',
              client: { id: 'secondary-client-internal' },
              site: { id: 'switched-site-internal' },
              role: {
                permissions: [{ permission: 'visibility:client-sites' }],
              },
            }),
          },
        });

        const result = await service.getPersonRepresentation(user);

        expect(result.allowedSiteIdsStr).toBe(
          'switched-site-internal,subsite-1,subsite-1-1,subsite-1-1-1,subsite-2',
        );
      });
    });

    describe('visibility extraction from role permissions', () => {
      it('should extract super-admin visibility from permissions', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return 'secondary-client-ext';
          return undefined;
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          client: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-client-internal',
            }),
          },
          site: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'switched-site-internal',
              subsites: [],
            }),
          },
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest.fn().mockResolvedValue({
              personId: 'person-internal-id',
              clientId: 'secondary-client-internal',
              siteId: 'switched-site-internal',
              client: { id: 'secondary-client-internal' },
              site: { id: 'switched-site-internal' },
              role: {
                permissions: [
                  { permission: 'visibility:super-admin' },
                  { permission: 'read:assets' },
                ],
              },
            }),
          },
        });

        const result = await service.getPersonRepresentation(user);

        expect(result.visibility).toBe('super-admin');
        expect(result.hasMultiClientVisibility).toBe(true);
        expect(result.hasMultiSiteVisibility).toBe(true);
      });

      it('should default to self visibility when no visibility permission in role', async () => {
        const user = createMockUser();
        mockClsService.get.mockImplementation((key: string) => {
          if (key === 'user') return user;
          if (key === 'activeClientId') return 'secondary-client-ext';
          return undefined;
        });

        mockPrismaService.bypassRLS.mockReturnValue({
          client: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-client-internal',
            }),
          },
          site: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'primary-site-internal',
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'switched-site-internal',
              subsites: [],
            }),
          },
          person: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'person-internal-id',
            }),
          },
          personClientAccess: {
            findFirst: jest.fn().mockResolvedValue({
              personId: 'person-internal-id',
              clientId: 'secondary-client-internal',
              siteId: 'switched-site-internal',
              client: { id: 'secondary-client-internal' },
              site: { id: 'switched-site-internal' },
              role: {
                permissions: [
                  { permission: 'read:assets' },
                  { permission: 'create:inspections' },
                ],
              },
            }),
          },
        });

        const result = await service.getPersonRepresentation(user);

        expect(result.visibility).toBe('self');
      });
    });
  });
});
