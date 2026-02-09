import { Test, TestingModule } from '@nestjs/testing';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
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

  const mockPrismaClient = {
    person: {
      findManyForPage: mockFindManyForPage,
      findUniqueOrThrow: mockFindUniqueOrThrow,
      update: mockUpdate,
    },
    $transaction: jest.fn().mockImplementation((cb) =>
      cb({
        person: {
          findManyForPage: mockFindManyForPage,
          findUniqueOrThrow: mockFindUniqueOrThrow,
          update: mockUpdate,
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
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
