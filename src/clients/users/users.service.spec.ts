import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from 'src/admin/roles/roles.service';
import { ApiClsService } from 'src/auth/api-cls.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryUserDto } from './dto/query-user.dto';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPersonClientAccessResults = [
    {
      id: 'pca-1',
      createdOn: new Date('2024-01-01'),
      modifiedOn: new Date('2024-01-02'),
      isPrimary: true,
      personId: 'person-1',
      clientId: 'client-1',
      siteId: 'site-1',
      roleId: 'role-1',
      person: {
        id: 'person-1',
        createdOn: new Date('2024-01-01'),
        modifiedOn: new Date('2024-01-02'),
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        username: 'john@example.com',
        idpId: 'idp-1',
        phoneNumber: '123-456-7890',
        position: 'Manager',
        active: true,
      },
      site: { externalId: 'site-ext-1' },
      client: { externalId: 'client-ext-1' },
      role: {
        id: 'role-1',
        name: 'Admin',
        description: 'Admin role',
        createdOn: new Date('2024-01-01'),
        modifiedOn: new Date('2024-01-01'),
        clientAssignable: true,
        notificationGroups: [],
        scope: 'CLIENT',
        capabilities: ['manage-users'],
        clientId: null,
      },
    },
    {
      id: 'pca-2',
      createdOn: new Date('2024-01-01'),
      modifiedOn: new Date('2024-01-02'),
      isPrimary: false,
      personId: 'person-2',
      clientId: 'client-1',
      siteId: 'site-2',
      roleId: 'role-2',
      person: {
        id: 'person-2',
        createdOn: new Date('2024-01-01'),
        modifiedOn: new Date('2024-01-02'),
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        username: 'jane@example.com',
        idpId: 'idp-2',
        phoneNumber: null,
        position: null,
        active: true,
      },
      site: { externalId: 'site-ext-2' },
      client: { externalId: 'client-ext-1' },
      role: {
        id: 'role-2',
        name: 'Inspector',
        description: 'Inspector role',
        createdOn: new Date('2024-01-01'),
        modifiedOn: new Date('2024-01-01'),
        clientAssignable: true,
        notificationGroups: [],
        scope: 'SITE',
        capabilities: ['perform-inspections'],
        clientId: null,
      },
    },
  ];

  const mockFindManyForPage = jest.fn().mockResolvedValue({
    results: mockPersonClientAccessResults,
    count: 2,
    limit: 10,
    offset: 0,
  });

  const mockPrismaClient = {
    personClientAccess: {
      findManyForPage: mockFindManyForPage,
      findFirstOrThrow: jest.fn().mockResolvedValue(mockPersonClientAccessResults[0]),
    },
  };

  const mockPrismaService = {
    build: jest.fn().mockResolvedValue(mockPrismaClient),
    bypassRLS: jest.fn().mockReturnValue(mockPrismaClient),
  };

  const mockKeycloakService = {
    findUsersByAttribute: jest.fn(),
    client: {
      users: {
        create: jest.fn(),
        update: jest.fn(),
        del: jest.fn(),
      },
    },
  };

  const mockRolesService = {
    getRole: jest.fn(),
    getRoles: jest.fn(),
  };

  const mockApiClsService = {
    get: jest.fn(),
    set: jest.fn(),
    requireUser: jest.fn(),
    requirePerson: jest.fn(),
    requireAccessGrant: jest.fn(),
  };

  const mockNotificationsService = {
    sendNotifications: jest.fn(),
    queueEmail: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-audience'),
  };

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: RolesService, useValue: mockRolesService },
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return users from database via PersonClientAccess', async () => {
      const result = await service.findAll();

      expect(result.results).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.offset).toBe(0);

      // Verify first user transformation
      expect(result.results[0]).toMatchObject({
        id: 'person-1',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '123-456-7890',
        position: 'Manager',
        active: true,
        siteExternalId: 'site-ext-1',
        clientExternalId: 'client-ext-1',
        roleName: 'Admin',
      });

      // Verify role is included
      expect(result.results[0].roles).toHaveLength(1);
      expect(result.results[0].roles[0].name).toBe('Admin');
    });

    it('should apply pagination correctly', async () => {
      const query = new QueryUserDto();
      query.limit = 10;
      query.offset = 5;

      await service.findAll(query);

      expect(mockFindManyForPage).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 10,
        }),
      );
    });

    it('should filter by personId when provided', async () => {
      const query = new QueryUserDto();
      query.personId = 'person-1';

      await service.findAll(query);

      expect(mockFindManyForPage).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            personId: 'person-1',
          }),
        }),
      );
    });

    it('should filter by site externalId when provided', async () => {
      const query = new QueryUserDto();
      query.site = { externalId: 'site-ext-1' };

      await service.findAll(query);

      expect(mockFindManyForPage).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            site: { externalId: 'site-ext-1' },
          }),
        }),
      );
    });

    it('should apply custom ordering when specified', async () => {
      const query = new QueryUserDto();
      query.order = { person: { email: 'desc' } };

      await service.findAll(query);

      expect(mockFindManyForPage).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { person: { email: 'desc' } },
        }),
      );
    });

    it('should handle users with null optional fields', async () => {
      const result = await service.findAll();

      // Second user has null phoneNumber and position
      expect(result.results[1]).toMatchObject({
        id: 'person-2',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: undefined,
        position: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should return a single user by id', async () => {
      const result = await service.findOne('person-1');

      expect(result).toMatchObject({
        id: 'person-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
    });

    it('should query PersonClientAccess with personId filter', async () => {
      await service.findOne('person-1');

      expect(mockPrismaClient.personClientAccess.findFirstOrThrow).toHaveBeenCalledWith({
        where: { personId: 'person-1' },
        include: expect.objectContaining({
          person: true,
          role: true,
        }),
      });
    });
  });
});
