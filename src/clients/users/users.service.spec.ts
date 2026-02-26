import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from 'src/generated/prisma/client';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryUserDto } from './dto/query-user.dto';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPersonResults = [
    {
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
      clientAccess: [
        {
          id: 'pca-1',
          isPrimary: true,
          client: {
            id: 'client-1',
            externalId: 'client-ext-1',
            name: 'Client 1',
          },
          site: { id: 'site-1', externalId: 'site-ext-1', name: 'Site 1' },
          role: { id: 'role-1', name: 'Admin', scope: 'CLIENT' },
        },
      ],
    },
    {
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
      clientAccess: [
        {
          id: 'pca-2',
          isPrimary: false,
          client: {
            id: 'client-1',
            externalId: 'client-ext-1',
            name: 'Client 1',
          },
          site: { id: 'site-2', externalId: 'site-ext-2', name: 'Site 2' },
          role: { id: 'role-2', name: 'Inspector', scope: 'SITE' },
        },
      ],
    },
  ];

  const mockFindManyForPage = jest.fn().mockResolvedValue({
    results: mockPersonResults,
    count: 2,
    limit: 10,
    offset: 0,
  });

  const mockFindUniqueOrThrow = jest
    .fn()
    .mockResolvedValue(mockPersonResults[0]);
  const mockUpdate = jest.fn().mockResolvedValue(mockPersonResults[0]);

  const mockSiteFindFirst = jest.fn();
  const mockRoleFindUnique = jest.fn();
  const mockPcaFindFirst = jest.fn();
  const mockPcaUpsert = jest.fn();
  const mockPcaDelete = jest.fn();
  const mockPcaUpdateMany = jest.fn();

  const mockPrismaClient = {
    person: {
      findManyForPage: mockFindManyForPage,
      findUniqueOrThrow: mockFindUniqueOrThrow,
      update: mockUpdate,
    },
    site: { findFirst: mockSiteFindFirst },
    role: { findUnique: mockRoleFindUnique },
    personClientAccess: {
      findFirst: mockPcaFindFirst,
      upsert: mockPcaUpsert,
    },
    $transaction: jest.fn().mockImplementation((cb) =>
      cb({
        person: {
          findManyForPage: mockFindManyForPage,
          findUniqueOrThrow: mockFindUniqueOrThrow,
          update: mockUpdate,
        },
        personClientAccess: {
          findFirst: mockPcaFindFirst,
          upsert: mockPcaUpsert,
          delete: mockPcaDelete,
          updateMany: mockPcaUpdateMany,
        },
      }),
    ),
  };

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue(mockPrismaClient),
  };

  const mockKeycloakService = {
    client: {
      users: {
        update: jest.fn().mockResolvedValue(undefined),
        resetPassword: jest.fn().mockResolvedValue(undefined),
        resetPasswordEmail: jest.fn().mockResolvedValue(undefined),
      },
    },
  };

  // Static method mock
  (KeycloakService as any).mergeAttributes = jest.fn().mockReturnValue({});

  const mockNotificationsService = {
    queueEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('https://frontend.example.com'),
  };

  const mockMemoryCacheService = {
    mdel: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: MemoryCacheService, useValue: mockMemoryCacheService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return users from Person table with clientAccess', async () => {
      const result = await service.findAll();

      expect(mockPrismaService.bypassRLS).toHaveBeenCalled();
      expect(result.results).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.offset).toBe(0);

      // Verify first user
      expect(result.results[0]).toMatchObject({
        id: 'person-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '123-456-7890',
        active: true,
      });

      // Verify clientAccess is included
      expect(result.results[0].clientAccess).toHaveLength(1);
      expect(result.results[0].clientAccess[0].role.name).toBe('Admin');
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

    it('should filter by id when provided', async () => {
      const query = new QueryUserDto();
      query.id = 'person-1';

      await service.findAll(query);

      expect(mockFindManyForPage).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'person-1',
          }),
        }),
      );
    });

    it('should apply custom ordering when specified', async () => {
      const query = new QueryUserDto();
      query.order = { email: 'desc' };

      await service.findAll(query);

      expect(mockFindManyForPage).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { email: 'desc' },
        }),
      );
    });

    it('should handle users with null optional fields', async () => {
      const result = await service.findAll();

      // Second user has null phoneNumber
      expect(result.results[1]).toMatchObject({
        id: 'person-2',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: null,
      });
    });
  });

  describe('findOne', () => {
    it('should return a single user by id', async () => {
      const result = await service.findOne('person-1');

      expect(mockPrismaService.bypassRLS).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'person-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
    });

    it('should query Person with id filter and include clientAccess', async () => {
      await service.findOne('person-1');

      expect(mockFindUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'person-1' },
        include: expect.objectContaining({
          clientAccess: expect.objectContaining({
            include: expect.objectContaining({
              client: expect.any(Object),
              site: expect.any(Object),
              role: expect.any(Object),
            }),
          }),
        }),
      });
    });
  });

  describe('update', () => {
    it('should update person in database', async () => {
      await service.update('person-1', { firstName: 'Johnny' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'person-1' },
          data: expect.objectContaining({
            firstName: 'Johnny',
          }),
        }),
      );
    });

    it('should sync changes to Keycloak if person has idpId', async () => {
      await service.update('person-1', { firstName: 'Johnny' });

      expect(mockKeycloakService.client.users.update).toHaveBeenCalledWith(
        { id: 'idp-1' },
        expect.objectContaining({
          firstName: 'Johnny',
        }),
      );
    });

    it('should not call Keycloak if person has no idpId', async () => {
      mockFindUniqueOrThrow.mockResolvedValueOnce({
        ...mockPersonResults[0],
        idpId: null,
      });

      await service.update('person-1', { firstName: 'Johnny' });

      expect(mockKeycloakService.client.users.update).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password via Keycloak', async () => {
      await service.resetPassword('person-1', {
        password: 'newPassword123!',
        sendEmail: false,
      });

      expect(
        mockKeycloakService.client.users.resetPassword,
      ).toHaveBeenCalledWith({
        id: 'idp-1',
        credential: {
          type: 'password',
          value: 'newPassword123!',
        },
      });
    });

    it('should send email notification when sendEmail is true', async () => {
      await service.resetPassword('person-1', {
        password: 'newPassword123!',
        sendEmail: true,
      });

      expect(mockNotificationsService.queueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['john@example.com'],
          templateName: 'manager_password_reset',
        }),
      );
    });

    it('should throw BadRequestException if person has no idpId', async () => {
      mockFindUniqueOrThrow.mockResolvedValueOnce({
        ...mockPersonResults[0],
        idpId: null,
      });

      await expect(
        service.resetPassword('person-1', {
          password: 'newPassword123!',
          sendEmail: false,
        }),
      ).rejects.toThrow('User has no identity provider account');
    });
  });

  describe('sendResetPasswordEmail', () => {
    it('should send reset password email via Keycloak', async () => {
      await service.sendResetPasswordEmail('person-1', 'shield-web');

      expect(
        mockKeycloakService.client.users.resetPasswordEmail,
      ).toHaveBeenCalledWith({
        id: 'idp-1',
        client_id: 'shield-web',
        redirect_uri: 'https://frontend.example.com',
      });
    });

    it('should throw BadRequestException if person has no idpId', async () => {
      mockFindUniqueOrThrow.mockResolvedValueOnce({
        ...mockPersonResults[0],
        idpId: null,
      });

      await expect(
        service.sendResetPasswordEmail('person-1', 'shield-web'),
      ).rejects.toThrow('User has no identity provider account');
    });
  });

  describe('addRole', () => {
    const addRoleDto = {
      clientId: 'client-1',
      siteId: 'site-1',
      roleId: 'role-1',
    };

    const mockUpsertResult = {
      id: 'pca-new',
      personId: 'person-1',
      clientId: 'client-1',
      siteId: 'site-1',
      roleId: 'role-1',
      isPrimary: true,
      client: { id: 'client-1', externalId: 'client-ext-1', name: 'Client 1' },
      site: { id: 'site-1', externalId: 'site-ext-1', name: 'Site 1' },
      role: { id: 'role-1', name: 'Admin', scope: 'CLIENT' },
    };

    beforeEach(() => {
      mockFindUniqueOrThrow.mockResolvedValue({
        id: 'person-1',
        idpId: 'idp-1',
      });
      mockSiteFindFirst.mockResolvedValue({
        id: 'site-1',
        clientId: 'client-1',
      });
      mockRoleFindUnique.mockResolvedValue({ id: 'role-1', name: 'Admin' });
      mockPcaFindFirst.mockResolvedValue(null); // no existing primary
      mockPcaUpsert.mockResolvedValue(mockUpsertResult);
    });

    it('should upsert PersonClientAccess and return the result', async () => {
      const result = await service.addRole('person-1', addRoleDto);

      expect(mockPrismaService.bypassRLS).toHaveBeenCalled();
      expect(mockPcaUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            personId_clientId_siteId_roleId: {
              personId: 'person-1',
              clientId: 'client-1',
              siteId: 'site-1',
              roleId: 'role-1',
            },
          },
        }),
      );
      expect(result).toEqual(mockUpsertResult);
    });

    it('should set isPrimary true when user has no existing primary', async () => {
      mockPcaFindFirst.mockResolvedValue(null);

      await service.addRole('person-1', addRoleDto);

      expect(mockPcaUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ isPrimary: true }),
        }),
      );
    });

    it('should set isPrimary true when existing primary matches same client and site', async () => {
      mockPcaFindFirst.mockResolvedValue({
        id: 'pca-existing',
        clientId: 'client-1',
        siteId: 'site-1',
        isPrimary: true,
      });

      await service.addRole('person-1', addRoleDto);

      expect(mockPcaUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ isPrimary: true }),
        }),
      );
    });

    it('should set isPrimary false when existing primary is for a different client', async () => {
      mockPcaFindFirst.mockResolvedValue({
        id: 'pca-existing',
        clientId: 'client-other',
        siteId: 'site-other',
        isPrimary: true,
      });

      await service.addRole('person-1', addRoleDto);

      expect(mockPcaUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ isPrimary: false }),
        }),
      );
    });

    it('should throw NotFoundException when person does not exist', async () => {
      mockFindUniqueOrThrow.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Not found', {
          code: 'P2025',
          clientVersion: '0',
        }),
      );

      await expect(service.addRole('nonexistent', addRoleDto)).rejects.toThrow();
    });

    it('should throw NotFoundException when site not found for client', async () => {
      mockSiteFindFirst.mockResolvedValue(null);

      await expect(service.addRole('person-1', addRoleDto)).rejects.toThrow(
        'Site with ID site-1 not found for client client-1',
      );
    });

    it('should throw NotFoundException when role not found', async () => {
      mockRoleFindUnique.mockResolvedValue(null);

      await expect(service.addRole('person-1', addRoleDto)).rejects.toThrow(
        'Role with ID role-1 not found',
      );
    });

    it('should invalidate cache when person has idpId', async () => {
      await service.addRole('person-1', addRoleDto);

      expect(mockMemoryCacheService.mdel).toHaveBeenCalled();
    });

    it('should skip cache invalidation when person has no idpId', async () => {
      mockFindUniqueOrThrow.mockResolvedValue({
        id: 'person-1',
        idpId: null,
      });

      await service.addRole('person-1', addRoleDto);

      expect(mockMemoryCacheService.mdel).not.toHaveBeenCalled();
    });
  });

  describe('removeRole', () => {
    const removeRoleDto = {
      clientId: 'client-1',
      siteId: 'site-1',
      roleId: 'role-1',
    };

    beforeEach(() => {
      mockFindUniqueOrThrow.mockResolvedValue({
        id: 'person-1',
        idpId: 'idp-1',
      });
      mockPcaFindFirst.mockResolvedValue({
        id: 'pca-1',
        personId: 'person-1',
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-1',
        isPrimary: false,
      });
      mockPcaDelete.mockResolvedValue(undefined);
    });

    it('should delete the PersonClientAccess and return success', async () => {
      const result = await service.removeRole('person-1', removeRoleDto);

      expect(mockPrismaService.bypassRLS).toHaveBeenCalled();
      expect(mockPcaDelete).toHaveBeenCalledWith({ where: { id: 'pca-1' } });
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when access combo not found', async () => {
      mockPcaFindFirst.mockResolvedValue(null);

      await expect(
        service.removeRole('person-1', removeRoleDto),
      ).rejects.toThrow('User does not have this client/site/role combination');
    });

    it('should throw NotFoundException when person does not exist', async () => {
      mockFindUniqueOrThrow.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Not found', {
          code: 'P2025',
          clientVersion: '0',
        }),
      );

      await expect(
        service.removeRole('nonexistent', removeRoleDto),
      ).rejects.toThrow();
    });

    it('should promote oldest remaining when removing a primary role', async () => {
      mockPcaFindFirst
        .mockResolvedValueOnce({
          id: 'pca-1',
          personId: 'person-1',
          clientId: 'client-1',
          siteId: 'site-1',
          roleId: 'role-1',
          isPrimary: true,
        })
        // remainingPrimary check — none found
        .mockResolvedValueOnce(null)
        // oldestRemaining
        .mockResolvedValueOnce({
          id: 'pca-2',
          clientId: 'client-2',
          siteId: 'site-2',
        });

      await service.removeRole('person-1', removeRoleDto);

      expect(mockPcaUpdateMany).toHaveBeenCalledWith({
        where: {
          personId: 'person-1',
          clientId: 'client-2',
          siteId: 'site-2',
        },
        data: { isPrimary: true },
      });
    });

    it('should not promote when another primary still exists', async () => {
      mockPcaFindFirst
        .mockResolvedValueOnce({
          id: 'pca-1',
          personId: 'person-1',
          clientId: 'client-1',
          siteId: 'site-1',
          roleId: 'role-1',
          isPrimary: true,
        })
        // remainingPrimary check — found one
        .mockResolvedValueOnce({ id: 'pca-3', isPrimary: true });

      await service.removeRole('person-1', removeRoleDto);

      expect(mockPcaUpdateMany).not.toHaveBeenCalled();
    });

    it('should invalidate cache when person has idpId', async () => {
      await service.removeRole('person-1', removeRoleDto);

      expect(mockMemoryCacheService.mdel).toHaveBeenCalled();
    });

    it('should skip cache invalidation when person has no idpId', async () => {
      mockFindUniqueOrThrow.mockResolvedValue({
        id: 'person-1',
        idpId: null,
      });

      await service.removeRole('person-1', removeRoleDto);

      expect(mockMemoryCacheService.mdel).not.toHaveBeenCalled();
    });
  });

  describe('generatePassword', () => {
    it('should generate a password of specified length', () => {
      const result = service.generatePassword(16);

      expect(result.password).toHaveLength(16);
    });

    it('should generate a password with default length of 12', () => {
      const result = service.generatePassword();

      expect(result.password).toHaveLength(12);
    });

    it('should include required character types', () => {
      // Multiple tests to increase confidence (password is shuffled)
      for (let i = 0; i < 10; i++) {
        const pw = service.generatePassword(20).password;
        expect(pw).toMatch(/[A-Z]/); // uppercase
        expect(pw).toMatch(/[a-z]/); // lowercase
        expect(pw).toMatch(/[0-9]/); // number
        expect(pw).toMatch(/[!@#$%^&*()]/); // special
      }
    });
  });
});
