import { Test, TestingModule } from '@nestjs/testing';
import { ApiClsService } from 'src/auth/api-cls.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { ApiConfigService } from '../../config/api-config.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvitationsDto } from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';

jest.mock('nanoid', () => ({ nanoid: () => 'mock-nanoid1' }));

describe('InvitationsService', () => {
  let service: InvitationsService;

  const mockBypassTx = {
    invitation: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      createManyAndReturn: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
    },
    site: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    person: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    personClientAccess: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockBuildResult = {
    invitation: {
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      findManyForPage: jest.fn(),
      update: jest.fn(),
    },
    site: { findMany: jest.fn() },
    role: { findMany: jest.fn() },
  };

  const mockPrismaService = {
    build: jest.fn(),
    bypassRLS: jest.fn(),
  };

  const mockApiClsService = {
    requirePerson: jest.fn(),
    requireAccessGrant: jest.fn(),
    requireUser: jest.fn(),
    get: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockMemoryCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    mdel: jest.fn(),
    getOrSet: jest.fn(),
  };

  const mockNotificationsService = {
    queueEmail: jest.fn().mockResolvedValue(undefined),
    queueEmailBulk: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaService.build.mockResolvedValue(mockBuildResult);
    mockPrismaService.bypassRLS.mockReturnValue({
      ...mockBypassTx,
      $transaction: jest.fn((fn) => fn(mockBypassTx)),
    });
    mockNotificationsService.queueEmail.mockResolvedValue(undefined);
    mockNotificationsService.queueEmailBulk.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: MemoryCacheService, useValue: mockMemoryCacheService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBulk', () => {
    const mockPerson = { id: 'person-1', email: 'admin@example.com' };
    const mockAccessGrant = {
      clientId: 'client-1',
      scopeAllows: jest.fn().mockReturnValue(false),
    };

    beforeEach(() => {
      mockApiClsService.requirePerson.mockReturnValue(mockPerson);
      mockApiClsService.requireAccessGrant.mockReturnValue(mockAccessGrant);
    });

    function setupValidSitesAndRoles() {
      mockBuildResult.site.findMany.mockResolvedValue([
        { id: 'site-1', clientId: 'client-1' },
      ]);
      mockBuildResult.role.findMany.mockResolvedValue([{ id: 'role-1' }]);
    }

    function mockCreatedInvitations(emails: string[]) {
      mockBypassTx.invitation.createManyAndReturn.mockResolvedValue(
        emails.map((_, i) => ({ id: `inv-${i + 1}` })),
      );
      mockBypassTx.invitation.findMany.mockResolvedValue(
        emails.map((email, i) => ({
          id: `inv-${i + 1}`,
          code: 'mock-nanoid1',
          email,
          client: {
            name: 'Test Client',
            id: 'client-1',
            externalId: 'ext-1',
          },
          site: { name: 'Test Site', id: 'site-1' },
          role: { name: 'Test Role', id: 'role-1' },
          createdBy: { firstName: 'Admin', lastName: 'User', id: 'person-1' },
          acceptedBy: null,
          expiresOn: new Date('2025-01-08'),
        })),
      );
    }

    it('should create multiple invitations in bulk', async () => {
      const dto: CreateInvitationsDto = {
        invitations: [
          { email: 'user1@example.com', siteId: 'site-1', roleId: 'role-1' },
          { email: 'user2@example.com', siteId: 'site-1', roleId: 'role-1' },
        ],
      };

      setupValidSitesAndRoles();
      mockCreatedInvitations(['user1@example.com', 'user2@example.com']);

      const result = await service.createBulk(dto);

      expect(result).toHaveLength(2);
      expect(result[0].inviteUrl).toContain('/accept-invite/');
      expect(result[1].inviteUrl).toContain('/accept-invite/');
      expect(mockBypassTx.invitation.createManyAndReturn).toHaveBeenCalledTimes(
        1,
      );
      expect(mockNotificationsService.queueEmailBulk).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.queueEmailBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            templateName: 'invitation',
            to: ['user1@example.com'],
          }),
          expect.objectContaining({
            templateName: 'invitation',
            to: ['user2@example.com'],
          }),
        ]),
      );
    });

    it('should use dto.clientId when provided (super admin flow)', async () => {
      const dto: CreateInvitationsDto = {
        clientId: 'other-client',
        invitations: [
          { email: 'user@example.com', siteId: 'site-2', roleId: 'role-1' },
        ],
      };

      mockBuildResult.site.findMany.mockResolvedValue([
        { id: 'site-2', clientId: 'other-client' },
      ]);
      mockBuildResult.role.findMany.mockResolvedValue([{ id: 'role-1' }]);

      mockBypassTx.invitation.createManyAndReturn.mockResolvedValue([
        { id: 'inv-1' },
      ]);
      mockBypassTx.invitation.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          code: 'mock-nanoid1',
          email: 'user@example.com',
          client: {
            name: 'Other Client',
            id: 'other-client',
            externalId: 'ext-2',
          },
          site: { name: 'Site 2', id: 'site-2' },
          role: { name: 'Test Role', id: 'role-1' },
          createdBy: { firstName: 'Admin', lastName: 'User', id: 'person-1' },
          acceptedBy: null,
          expiresOn: new Date('2025-01-08'),
        },
      ]);

      const result = await service.createBulk(dto);

      expect(result).toHaveLength(1);
      expect(mockBypassTx.invitation.createManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ clientId: 'other-client' }),
          ]),
        }),
      );
    });

    it('should throw if a site is not found', async () => {
      const dto: CreateInvitationsDto = {
        invitations: [
          {
            email: 'user@example.com',
            siteId: 'nonexistent',
            roleId: 'role-1',
          },
        ],
      };

      mockBuildResult.site.findMany.mockResolvedValue([]);
      mockBuildResult.role.findMany.mockResolvedValue([{ id: 'role-1' }]);

      await expect(service.createBulk(dto)).rejects.toThrow(
        'Site with ID nonexistent not found',
      );
    });

    it('should throw if a site does not belong to the client', async () => {
      const dto: CreateInvitationsDto = {
        invitations: [
          { email: 'user@example.com', siteId: 'site-1', roleId: 'role-1' },
        ],
      };

      mockBuildResult.site.findMany.mockResolvedValue([
        { id: 'site-1', clientId: 'other-client' },
      ]);
      mockBuildResult.role.findMany.mockResolvedValue([{ id: 'role-1' }]);

      await expect(service.createBulk(dto)).rejects.toThrow(
        'does not belong to client',
      );
    });

    it('should throw if a role is not found', async () => {
      const dto: CreateInvitationsDto = {
        invitations: [
          { email: 'user@example.com', siteId: 'site-1', roleId: 'role-1' },
        ],
      };

      mockBuildResult.site.findMany.mockResolvedValue([
        { id: 'site-1', clientId: 'client-1' },
      ]);
      mockBuildResult.role.findMany.mockResolvedValue([]);

      await expect(service.createBulk(dto)).rejects.toThrow(
        'Role with ID role-1 not found',
      );
    });

    it('should still return invitations if email queuing fails', async () => {
      const dto: CreateInvitationsDto = {
        invitations: [
          { email: 'user@example.com', siteId: 'site-1', roleId: 'role-1' },
        ],
      };

      setupValidSitesAndRoles();
      mockCreatedInvitations(['user@example.com']);
      mockNotificationsService.queueEmailBulk.mockRejectedValue(
        new Error('Redis down'),
      );

      const result = await service.createBulk(dto);

      expect(result).toHaveLength(1);
      expect(result[0].inviteUrl).toContain('/accept-invite/');
    });
  });

  describe('resend', () => {
    it('should resend email for a pending invitation', async () => {
      const mockInvitation = {
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        email: 'test@example.com',
        expiresOn: new Date(Date.now() + 86400000),
        client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
        site: { name: 'Test Site', id: 'site-1' },
        role: { name: 'Test Role', id: 'role-1' },
        createdBy: { firstName: 'Admin', lastName: 'User', id: 'person-1' },
        acceptedBy: null,
      };

      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue(
        mockInvitation,
      );

      const result = await service.resend('inv-1');

      expect(result.inviteUrl).toContain('/accept-invite/abc123');
      expect(mockNotificationsService.queueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'invitation',
          to: ['test@example.com'],
        }),
      );
    });

    it('should throw if invitation is not PENDING', async () => {
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        status: 'ACCEPTED',
        expiresOn: new Date(Date.now() + 86400000),
      });

      await expect(service.resend('inv-1')).rejects.toThrow(
        'Cannot resend invitation with status ACCEPTED',
      );
    });

    it('should expire and throw if invitation is past expiration', async () => {
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        expiresOn: new Date(Date.now() - 86400000),
      });

      await expect(service.resend('inv-1')).rejects.toThrow(
        'This invitation has expired',
      );
      expect(mockBuildResult.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'EXPIRED' },
      });
    });
  });

  describe('validateCode', () => {
    it('should return valid invitation info for a valid code', async () => {
      const mockInvitation = {
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        expiresOn: new Date(Date.now() + 86400000), // Tomorrow
        email: 'test@example.com',
        roleId: 'role-1',
        siteId: 'site-1',
        client: { id: 'client-1', name: 'Test Client' },
      };

      mockBypassTx.invitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await service.validateCode('abc123');

      expect(result.valid).toBe(true);
      expect(result.client).toEqual({ id: 'client-1', name: 'Test Client' });
      expect(result.email).toBe('test@example.com');
    });
  });
});
