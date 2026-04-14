import { Test, TestingModule } from '@nestjs/testing';
import { ApiClsService } from 'src/auth/api-cls.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { ApiConfigService } from '../../config/api-config.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvitationsDto } from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';

jest.mock('nanoid', () => ({ nanoid: () => 'mock-nanoid1' }));
jest.mock('src/auth/utils/access-grants', () => ({
  clearAccessGrantResponseCache: jest.fn().mockResolvedValue(undefined),
}));

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
      updateMany: jest.fn(),
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
      updateMany: jest.fn(),
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
      // First findMany call is the dedup check (no existing PENDING).
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([]);
      mockBypassTx.invitation.findMany.mockResolvedValueOnce(
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
          role: { name: 'Test Role', id: 'role-1', scope: 'SITE' },
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
            templateProps: expect.objectContaining({
              inviteeEmail: 'user1@example.com',
            }),
          }),
          expect.objectContaining({
            templateName: 'invitation',
            to: ['user2@example.com'],
            templateProps: expect.objectContaining({
              inviteeEmail: 'user2@example.com',
            }),
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
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([]);
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([
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
          role: { name: 'Test Role', id: 'role-1', scope: 'SITE' },
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
        role: { name: 'Test Role', id: 'role-1', scope: 'SITE' },
        createdBy: { firstName: 'Admin', lastName: 'User', id: 'person-1' },
        acceptedBy: null,
      };

      // RLS auth check
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
      });
      // bypassRLS full fetch
      mockBypassTx.invitation.findUniqueOrThrow.mockResolvedValue(
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
      });
      mockBypassTx.invitation.findUniqueOrThrow.mockResolvedValue({
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
      });
      mockBypassTx.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        expiresOn: new Date(Date.now() - 86400000),
      });

      await expect(service.resend('inv-1')).rejects.toThrow(
        'This invitation has expired',
      );
      // Expiry is derived from the date on the frontend; resend no longer
      // mutates status so it stays PENDING in the DB.
      expect(mockBypassTx.invitation.update).not.toHaveBeenCalled();
      expect(mockBypassTx.invitation.updateMany).not.toHaveBeenCalled();
    });

    it('builds email even when createdBy is filtered by RLS on initial RLS fetch', async () => {
      // Auth passes under RLS (invitation row is visible),
      // and the bypassRLS fetch returns full createdBy.
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
      });
      mockBypassTx.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        email: 'test@example.com',
        expiresOn: new Date(Date.now() + 86400000),
        client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
        site: { name: 'Test Site', id: 'site-1' },
        role: { name: 'Test Role', id: 'role-1', scope: 'SITE' },
        createdBy: { firstName: 'Super', lastName: 'Admin', id: 'super-1' },
        acceptedBy: null,
      });

      await service.resend('inv-1');

      expect(mockNotificationsService.queueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          templateProps: expect.objectContaining({
            inviterFirstName: 'Super',
            inviterLastName: 'Admin',
          }),
        }),
      );
    });
  });

  describe('accept', () => {
    const mockUser = { idpId: 'idp-1' };
    const mockPerson = { id: 'person-1', email: 'other@example.com' };

    beforeEach(() => {
      mockApiClsService.requireUser.mockReturnValue(mockUser);
      mockApiClsService.requirePerson.mockReturnValue(mockPerson);
    });

    it('should throw ForbiddenException with current email when emails mismatch', async () => {
      mockBypassTx.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        email: 'invited@example.com',
        expiresOn: new Date(Date.now() + 86400000),
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-1',
        client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
        site: { name: 'Test Site', id: 'site-1' },
        role: { name: 'Test Role', id: 'role-1', scope: 'SITE' },
        createdBy: { firstName: 'Admin', lastName: 'User', id: 'person-1' },
      });

      await expect(service.accept('abc123')).rejects.toThrow(
        'You are signed in with other@example.com',
      );
    });
  });

  describe('validateCode', () => {
    it('should return valid invitation info for a valid code', async () => {
      const mockInvitation = {
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        groupId: null,
        expiresOn: new Date(Date.now() + 86400000),
        email: 'test@example.com',
        roleId: 'role-1',
        siteId: 'site-1',
        client: { id: 'client-1', name: 'Test Client' },
        site: { id: 'site-1', name: 'Test Site' },
        role: { id: 'role-1', name: 'Test Role', scope: 'SITE' },
      };

      mockBypassTx.invitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await service.validateCode('abc123');

      expect(result.valid).toBe(true);
      expect(result.client).toEqual({ id: 'client-1', name: 'Test Client' });
      expect(result.email).toBe('test@example.com');
      expect(result.assignments).toEqual([
        { siteName: 'Test Site', roleName: 'Test Role' },
      ]);
    });

    it('should return all assignments for grouped invitations', async () => {
      const mockInvitation = {
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        groupId: 'group-1',
        expiresOn: new Date(Date.now() + 86400000),
        email: 'test@example.com',
        roleId: 'role-1',
        siteId: 'site-1',
        client: { id: 'client-1', name: 'Test Client' },
        site: { id: 'site-1', name: 'Site A' },
        role: { id: 'role-1', name: 'Inspector', scope: 'SITE' },
      };

      mockBypassTx.invitation.findUnique.mockResolvedValue(mockInvitation);
      mockBypassTx.invitation.findMany.mockResolvedValue([
        {
          site: { name: 'Site A' },
          role: { name: 'Inspector', scope: 'SITE' },
        },
        { site: { name: 'Site B' }, role: { name: 'Manager', scope: 'SITE' } },
      ]);

      const result = await service.validateCode('abc123');

      expect(result.valid).toBe(true);
      expect(result.assignments).toEqual([
        { siteName: 'Site A', roleName: 'Inspector' },
        { siteName: 'Site B', roleName: 'Manager' },
      ]);
    });
  });

  describe('accept (grouped)', () => {
    const mockUser = { idpId: 'idp-1' };
    const mockPerson = { id: 'person-1', email: 'test@example.com' };

    beforeEach(() => {
      mockApiClsService.requireUser.mockReturnValue(mockUser);
      mockApiClsService.requirePerson.mockReturnValue(mockPerson);
    });

    it('should accept all invitations in a group', async () => {
      const baseInvitation = {
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        groupId: 'group-1',
        email: 'test@example.com',
        expiresOn: new Date(Date.now() + 86400000),
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-1',
        client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
        site: { name: 'Site A', id: 'site-1' },
        role: { name: 'Inspector', id: 'role-1', scope: 'SITE' },
        createdBy: { firstName: 'Admin', lastName: 'User', id: 'admin-1' },
      };

      const siblingInvitation = {
        ...baseInvitation,
        id: 'inv-2',
        code: 'def456',
        siteId: 'site-2',
        roleId: 'role-2',
        site: { name: 'Site B', id: 'site-2' },
        role: { name: 'Manager', id: 'role-2', scope: 'SITE' },
      };

      // findUnique returns the clicked invitation
      mockBypassTx.invitation.findUnique.mockResolvedValue(baseInvitation);
      // findMany returns all group siblings
      mockBypassTx.invitation.findMany.mockResolvedValue([
        baseInvitation,
        siblingInvitation,
      ]);
      // No existing primary access
      mockBypassTx.personClientAccess.findFirst.mockResolvedValue(null);
      // Upsert returns access records
      mockBypassTx.personClientAccess.upsert
        .mockResolvedValueOnce({
          clientId: 'client-1',
          siteId: 'site-1',
          roleId: 'role-1',
        })
        .mockResolvedValueOnce({
          clientId: 'client-1',
          siteId: 'site-2',
          roleId: 'role-2',
        });
      mockBypassTx.invitation.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.accept('abc123');

      expect(result.success).toBe(true);
      // Should have accepted both invitations
      expect(mockBypassTx.personClientAccess.upsert).toHaveBeenCalledTimes(2);
      expect(mockBypassTx.invitation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['inv-1', 'inv-2'] } },
          data: expect.objectContaining({ status: 'ACCEPTED' }),
        }),
      );
    });
  });

  describe('createBulk (dedup)', () => {
    const mockPerson = { id: 'person-1', email: 'admin@example.com' };
    const mockAccessGrant = {
      clientId: 'client-1',
      scopeAllows: jest.fn().mockReturnValue(false),
    };

    beforeEach(() => {
      mockApiClsService.requirePerson.mockReturnValue(mockPerson);
      mockApiClsService.requireAccessGrant.mockReturnValue(mockAccessGrant);
    });

    it('throws ConflictException when a PENDING invitation already exists', async () => {
      const dto: CreateInvitationsDto = {
        invitations: [
          { email: 'user@example.com', siteId: 'site-1', roleId: 'role-1' },
        ],
      };

      mockBuildResult.site.findMany.mockResolvedValue([
        { id: 'site-1', clientId: 'client-1' },
      ]);
      mockBuildResult.role.findMany.mockResolvedValue([{ id: 'role-1' }]);

      // Dedup query returns an existing PENDING invite for this tuple.
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([
        { email: 'user@example.com', siteId: 'site-1', roleId: 'role-1' },
      ]);

      await expect(service.createBulk(dto)).rejects.toThrow(
        /pending invitation already exists/i,
      );
      expect(
        mockBypassTx.invitation.createManyAndReturn,
      ).not.toHaveBeenCalled();
    });
  });

  describe('resend (grouped)', () => {
    it('sends a grouped email with all PENDING siblings', async () => {
      const base = {
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        groupId: 'group-1',
        email: 'test@example.com',
        expiresOn: new Date(Date.now() + 86400000),
        client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
        site: { name: 'Site A', id: 'site-1' },
        role: { name: 'Inspector', id: 'role-1', scope: 'SITE' },
        createdBy: { firstName: 'Admin', lastName: 'User', id: 'admin-1' },
      };
      const sibling = {
        ...base,
        id: 'inv-2',
        code: 'def456',
        site: { name: 'Site B', id: 'site-2' },
        role: { name: 'Manager', id: 'role-2', scope: 'SITE' },
      };

      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
      });
      mockBypassTx.invitation.findUniqueOrThrow.mockResolvedValue(base);
      mockBypassTx.invitation.findMany.mockResolvedValue([base, sibling]);

      await service.resend('inv-1');

      expect(mockBypassTx.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            groupId: 'group-1',
            status: 'PENDING',
            expiresOn: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        }),
      );
      expect(mockNotificationsService.queueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          templateProps: expect.objectContaining({
            assignments: [
              { siteName: 'Site A', roleName: 'Inspector' },
              { siteName: 'Site B', roleName: 'Manager' },
            ],
          }),
        }),
      );
    });

    it('expires the entire group when the clicked invite is past expiry', async () => {
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
      });
      mockBypassTx.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        groupId: 'group-1',
        status: 'PENDING',
        expiresOn: new Date(Date.now() - 86400000),
      });

      await expect(service.resend('inv-1')).rejects.toThrow(
        'This invitation has expired',
      );
      // Status is not mutated on expiry — frontend derives from date.
      expect(mockBypassTx.invitation.update).not.toHaveBeenCalled();
      expect(mockBypassTx.invitation.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('revokes all siblings in the group via updateMany', async () => {
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        groupId: 'group-1',
        status: 'PENDING',
      });
      (mockBuildResult.invitation as any).updateManyAndReturn = jest
        .fn()
        .mockResolvedValue([{ id: 'inv-1' }, { id: 'inv-2' }, { id: 'inv-3' }]);

      const result = await service.revoke('inv-1');

      expect(
        (mockBuildResult.invitation as any).updateManyAndReturn,
      ).toHaveBeenCalledWith({
        where: { groupId: 'group-1', status: 'PENDING' },
        data: { status: 'REVOKED' },
        select: { id: true },
      });
      expect(result).toEqual({
        groupId: 'group-1',
        revokedIds: ['inv-1', 'inv-2', 'inv-3'],
      });
    });

    it('revokes a single (ungrouped) invitation', async () => {
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        groupId: null,
        status: 'PENDING',
      });

      const result = await service.revoke('inv-1');

      expect(mockBuildResult.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'REVOKED' },
      });
      expect(result).toEqual({ groupId: null, revokedIds: ['inv-1'] });
    });

    it('throws BadRequestException when invitation is already accepted', async () => {
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        status: 'ACCEPTED',
      });

      await expect(service.revoke('inv-1')).rejects.toThrow(
        /already accepted/i,
      );
    });
  });

  describe('accept (partial group)', () => {
    const mockUser = { idpId: 'idp-1' };
    const mockPerson = { id: 'person-1', email: 'test@example.com' };

    beforeEach(() => {
      mockApiClsService.requireUser.mockReturnValue(mockUser);
      mockApiClsService.requirePerson.mockReturnValue(mockPerson);
    });

    it('accepts only PENDING siblings when others were revoked concurrently', async () => {
      const clicked = {
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        groupId: 'group-1',
        email: 'test@example.com',
        expiresOn: new Date(Date.now() + 86400000),
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-1',
        client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
        site: { name: 'Site A', id: 'site-1' },
        role: { name: 'Inspector', id: 'role-1', scope: 'SITE' },
        createdBy: { firstName: 'Admin', lastName: 'User', id: 'admin-1' },
      };

      mockBypassTx.invitation.findUnique.mockResolvedValue(clicked);
      // Only the clicked invite is still PENDING; the other was revoked.
      mockBypassTx.invitation.findMany.mockResolvedValue([clicked]);
      // Total siblings (incl. revoked) = 2.
      mockBypassTx.invitation.count.mockResolvedValue(2);
      mockBypassTx.personClientAccess.findFirst.mockResolvedValue(null);
      mockBypassTx.personClientAccess.upsert.mockResolvedValue({
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-1',
      });
      mockBypassTx.invitation.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.accept('abc123');

      expect(result.success).toBe(true);
      expect(mockBypassTx.personClientAccess.upsert).toHaveBeenCalledTimes(1);
      expect(mockBypassTx.invitation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['inv-1'] } },
        }),
      );
    });

    it('anchors isPrimary on the clicked invitation, not the oldest by createdOn', async () => {
      const oldest = {
        id: 'inv-old',
        code: 'oldcode',
        status: 'PENDING',
        groupId: 'group-1',
        email: 'test@example.com',
        expiresOn: new Date(Date.now() + 86400000),
        clientId: 'client-1',
        siteId: 'site-old',
        roleId: 'role-old',
        client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
        site: { name: 'Old Site', id: 'site-old' },
        role: { name: 'Old Role', id: 'role-old', scope: 'SITE' },
        createdBy: { firstName: 'Admin', lastName: 'User', id: 'admin-1' },
      };
      const clicked = {
        ...oldest,
        id: 'inv-clicked',
        code: 'clickedcode',
        siteId: 'site-clicked',
        roleId: 'role-clicked',
        site: { name: 'Clicked Site', id: 'site-clicked' },
        role: { name: 'Clicked Role', id: 'role-clicked', scope: 'SITE' },
      };

      mockBypassTx.invitation.findUnique.mockResolvedValue(clicked);
      // Sorted by createdOn asc → `oldest` is first, `clicked` is second.
      mockBypassTx.invitation.findMany.mockResolvedValue([oldest, clicked]);
      mockBypassTx.invitation.count.mockResolvedValue(2);
      mockBypassTx.personClientAccess.findFirst.mockResolvedValue(null);
      mockBypassTx.personClientAccess.upsert.mockResolvedValue({
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-1',
      });
      mockBypassTx.invitation.updateMany.mockResolvedValue({ count: 2 });

      await service.accept('clickedcode');

      // First upsert is for `oldest` and should NOT be primary.
      expect(mockBypassTx.personClientAccess.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          create: expect.objectContaining({
            siteId: 'site-old',
            isPrimary: false,
          }),
        }),
      );
      // Second upsert is for `clicked` and SHOULD be primary.
      expect(mockBypassTx.personClientAccess.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          create: expect.objectContaining({
            siteId: 'site-clicked',
            isPrimary: true,
          }),
        }),
      );
    });

    it('falls back to index 0 when clicked code is not in the PENDING sibling list', async () => {
      // Race: between fetching `invitation` and re-querying PENDING siblings,
      // the clicked invite was concurrently moved out of PENDING. findIndex
      // returns -1; Math.max(0, -1) = 0 anchors primary on the first sibling.
      const clicked = {
        id: 'inv-clicked',
        code: 'clickedcode',
        status: 'PENDING',
        groupId: 'group-1',
        email: 'test@example.com',
        expiresOn: new Date(Date.now() + 86400000),
        clientId: 'client-1',
        siteId: 'site-clicked',
        roleId: 'role-clicked',
        client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
        site: { name: 'Clicked Site', id: 'site-clicked' },
        role: { name: 'Clicked Role', id: 'role-clicked', scope: 'SITE' },
        createdBy: { firstName: 'Admin', lastName: 'User', id: 'admin-1' },
      };
      const otherSibling = {
        ...clicked,
        id: 'inv-other',
        code: 'othercode',
        siteId: 'site-other',
        roleId: 'role-other',
        site: { name: 'Other Site', id: 'site-other' },
        role: { name: 'Other Role', id: 'role-other', scope: 'SITE' },
      };

      mockBypassTx.invitation.findUnique.mockResolvedValue(clicked);
      // PENDING list does NOT include the clicked invite.
      mockBypassTx.invitation.findMany.mockResolvedValue([otherSibling]);
      mockBypassTx.invitation.count.mockResolvedValue(2);
      mockBypassTx.personClientAccess.findFirst.mockResolvedValue(null);
      mockBypassTx.personClientAccess.upsert.mockResolvedValue({
        clientId: 'client-1',
        siteId: 'site-other',
        roleId: 'role-other',
      });
      mockBypassTx.invitation.updateMany.mockResolvedValue({ count: 1 });

      await service.accept('clickedcode');

      // Fallback: first (and only) sibling gets primary.
      expect(mockBypassTx.personClientAccess.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          create: expect.objectContaining({
            siteId: 'site-other',
            isPrimary: true,
          }),
        }),
      );
    });

    it('invalidates the access-grant cache for every affected client/site', async () => {
      const { clearAccessGrantResponseCache } = jest.requireMock(
        'src/auth/utils/access-grants',
      );
      clearAccessGrantResponseCache.mockClear();

      const clicked = {
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        groupId: null,
        email: 'test@example.com',
        expiresOn: new Date(Date.now() + 86400000),
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-1',
        client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
        site: { name: 'Site A', id: 'site-1' },
        role: { name: 'Inspector', id: 'role-1', scope: 'SITE' },
        createdBy: { firstName: 'Admin', lastName: 'User', id: 'admin-1' },
      };

      mockBypassTx.invitation.findUnique.mockResolvedValue(clicked);
      mockBypassTx.personClientAccess.findFirst.mockResolvedValue(null);
      mockBypassTx.personClientAccess.upsert.mockResolvedValue({
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-1',
      });
      mockBypassTx.invitation.updateMany.mockResolvedValue({ count: 1 });

      await service.accept('abc123');

      expect(clearAccessGrantResponseCache).toHaveBeenCalledWith(
        expect.objectContaining({
          idpId: 'idp-1',
          clientId: 'client-1',
          siteId: 'site-1',
        }),
      );
    });
  });

  describe('renew', () => {
    const mockPerson = { id: 'person-1', email: 'admin@example.com' };
    const mockAccessGrant = {
      clientId: 'client-1',
      scopeAllows: jest.fn().mockReturnValue(false),
    };

    beforeEach(() => {
      mockApiClsService.requirePerson.mockReturnValue(mockPerson);
      mockApiClsService.requireAccessGrant.mockReturnValue(mockAccessGrant);
    });

    it('revokes the old invite and delegates to createBulk for a single invite', async () => {
      // RLS auth check
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
      });
      // Original fetch (bypass). Status is PENDING even though date has
      // passed — per the deprecated-EXPIRED policy, status stays PENDING and
      // expiry is derived from `expiresOn`.
      mockBypassTx.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        groupId: null,
        clientId: 'client-1',
        email: 'user@example.com',
        siteId: 'site-1',
        roleId: 'role-1',
      });

      // createBulk downstream setup
      mockBuildResult.site.findMany.mockResolvedValue([
        { id: 'site-1', clientId: 'client-1' },
      ]);
      mockBuildResult.role.findMany.mockResolvedValue([{ id: 'role-1' }]);
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([]); // dedup: none
      mockBypassTx.invitation.createManyAndReturn.mockResolvedValue([
        { id: 'inv-new' },
      ]);
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([
        {
          id: 'inv-new',
          code: 'mock-nanoid1',
          email: 'user@example.com',
          groupId: null,
          client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
          site: { name: 'Site A', id: 'site-1' },
          role: { name: 'Inspector', id: 'role-1', scope: 'SITE' },
          createdBy: { firstName: 'Admin', lastName: 'User', id: 'person-1' },
          acceptedBy: null,
          expiresOn: new Date('2025-01-08'),
        },
      ]);

      const result = await service.renew('inv-1', { expiresInDays: 14 });

      // Old row is marked REVOKED.
      expect(mockBypassTx.invitation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['inv-1'] } },
        data: { status: 'REVOKED' },
      });
      // New invite is created via createBulk path.
      expect(mockBypassTx.invitation.createManyAndReturn).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('inv-new');
    });

    it('revokes all siblings and re-creates the whole group for a grouped invite', async () => {
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
      });
      mockBypassTx.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        groupId: 'group-1',
        clientId: 'client-1',
        email: 'user@example.com',
        siteId: 'site-1',
        roleId: 'role-1',
      });
      // Sibling fetch for the group.
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([
        {
          id: 'inv-1',
          email: 'user@example.com',
          siteId: 'site-1',
          roleId: 'role-1',
        },
        {
          id: 'inv-2',
          email: 'user@example.com',
          siteId: 'site-2',
          roleId: 'role-2',
        },
      ]);

      // createBulk downstream: site/role validation, dedup, create, fetch.
      mockBuildResult.site.findMany.mockResolvedValue([
        { id: 'site-1', clientId: 'client-1' },
        { id: 'site-2', clientId: 'client-1' },
      ]);
      mockBuildResult.role.findMany.mockResolvedValue([
        { id: 'role-1' },
        { id: 'role-2' },
      ]);
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([]); // dedup
      mockBypassTx.invitation.createManyAndReturn.mockResolvedValue([
        { id: 'inv-new-1' },
        { id: 'inv-new-2' },
      ]);
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([
        {
          id: 'inv-new-1',
          code: 'mock-nanoid1',
          email: 'user@example.com',
          groupId: 'mock-nanoid1',
          client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
          site: { name: 'Site A', id: 'site-1' },
          role: { name: 'Inspector', id: 'role-1', scope: 'SITE' },
          createdBy: { firstName: 'Admin', lastName: 'User', id: 'person-1' },
          acceptedBy: null,
          expiresOn: new Date('2025-01-08'),
        },
        {
          id: 'inv-new-2',
          code: 'mock-nanoid1',
          email: 'user@example.com',
          groupId: 'mock-nanoid1',
          client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
          site: { name: 'Site B', id: 'site-2' },
          role: { name: 'Manager', id: 'role-2', scope: 'SITE' },
          createdBy: { firstName: 'Admin', lastName: 'User', id: 'person-1' },
          acceptedBy: null,
          expiresOn: new Date('2025-01-08'),
        },
      ]);

      const result = await service.renew('inv-1');

      // Both old sibling ids are revoked (not just the clicked one).
      expect(mockBypassTx.invitation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['inv-1', 'inv-2'] } },
        data: { status: 'REVOKED' },
      });
      // New rows created via createBulk, matching the old (site, role) pairs.
      expect(mockBypassTx.invitation.createManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ siteId: 'site-1', roleId: 'role-1' }),
            expect.objectContaining({ siteId: 'site-2', roleId: 'role-2' }),
          ]),
        }),
      );
      expect(result).toHaveLength(2);
    });

    it('rejects REVOKED invitations', async () => {
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
      });
      mockBypassTx.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        status: 'REVOKED',
        groupId: null,
        clientId: 'client-1',
        email: 'user@example.com',
        siteId: 'site-1',
        roleId: 'role-1',
      });

      await expect(service.renew('inv-1')).rejects.toThrow(/has been revoked/i);
    });

    it('rejects ACCEPTED invitations', async () => {
      mockBuildResult.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
      });
      mockBypassTx.invitation.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-1',
        status: 'ACCEPTED',
        groupId: null,
        clientId: 'client-1',
        email: 'user@example.com',
        siteId: 'site-1',
        roleId: 'role-1',
      });

      await expect(service.renew('inv-1')).rejects.toThrow(
        /already been accepted/i,
      );
    });
  });

  describe('expireStale', () => {
    it('soft-deletes all PENDING past-expiry invitations by flipping to REVOKED', async () => {
      mockBuildResult.invitation.updateMany.mockResolvedValue({ count: 4 });

      const result = await service.expireStale();

      expect(result).toEqual({ count: 4 });
      expect(mockBuildResult.invitation.updateMany).toHaveBeenCalledWith({
        where: { status: 'PENDING', expiresOn: { lt: expect.any(Date) } },
        data: { status: 'REVOKED' },
      });
    });
  });

  describe('role scope visibility', () => {
    it('omits siteName in the email when role scope is CLIENT or greater', async () => {
      const dto: CreateInvitationsDto = {
        invitations: [
          { email: 'user@example.com', siteId: 'site-1', roleId: 'role-1' },
        ],
      };

      mockApiClsService.requirePerson.mockReturnValue({
        id: 'person-1',
        email: 'admin@example.com',
      });
      mockApiClsService.requireAccessGrant.mockReturnValue({
        clientId: 'client-1',
        scopeAllows: jest.fn().mockReturnValue(false),
      });
      mockBuildResult.site.findMany.mockResolvedValue([
        { id: 'site-1', clientId: 'client-1' },
      ]);
      mockBuildResult.role.findMany.mockResolvedValue([{ id: 'role-1' }]);
      mockBypassTx.invitation.createManyAndReturn.mockResolvedValue([
        { id: 'inv-1' },
      ]);
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([]);
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([
        {
          id: 'inv-1',
          code: 'mock-nanoid1',
          email: 'user@example.com',
          groupId: null,
          client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
          site: { name: 'Test Site', id: 'site-1' },
          role: { name: 'Client Admin', id: 'role-1', scope: 'CLIENT' },
          createdBy: { firstName: 'Admin', lastName: 'User', id: 'person-1' },
          acceptedBy: null,
          expiresOn: new Date('2025-01-08'),
        },
      ]);

      await service.createBulk(dto);

      const call = mockNotificationsService.queueEmailBulk.mock.calls[0][0][0];
      expect(call.templateProps.roleName).toBe('Client Admin');
      expect(call.templateProps.siteName).toBeUndefined();
    });

    it('omits siteName for CLIENT-scoped roles in validateCode', async () => {
      mockBypassTx.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'abc',
        status: 'PENDING',
        groupId: null,
        expiresOn: new Date(Date.now() + 86400000),
        email: 'test@example.com',
        client: { id: 'client-1', name: 'Test Client' },
        site: { id: 'site-1', name: 'Site A' },
        role: { id: 'role-1', name: 'Client Admin', scope: 'CLIENT' },
      });

      const result = await service.validateCode('abc');
      expect(result.assignments).toEqual([
        { siteName: undefined, roleName: 'Client Admin' },
      ]);
    });
  });

  describe('validateCode (group with revoked sibling)', () => {
    it('returns only PENDING sibling assignments', async () => {
      mockBypassTx.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        groupId: 'group-1',
        expiresOn: new Date(Date.now() + 86400000),
        email: 'test@example.com',
        client: { id: 'client-1', name: 'Test Client' },
        site: { id: 'site-1', name: 'Site A' },
        role: { id: 'role-1', name: 'Inspector', scope: 'SITE' },
      });
      // Only one PENDING sibling (the other was revoked).
      mockBypassTx.invitation.findMany.mockResolvedValue([
        {
          site: { name: 'Site A' },
          role: { name: 'Inspector', scope: 'SITE' },
        },
      ]);

      const result = await service.validateCode('abc123');

      expect(result.assignments).toEqual([
        { siteName: 'Site A', roleName: 'Inspector' },
      ]);
      expect(mockBypassTx.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            groupId: 'group-1',
            status: 'PENDING',
          }),
        }),
      );
    });

    it('expires the entire group when expired', async () => {
      mockBypassTx.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        groupId: 'group-1',
        expiresOn: new Date(Date.now() - 86400000),
        email: 'test@example.com',
        client: { id: 'client-1', name: 'Test Client' },
        site: { id: 'site-1', name: 'Site A' },
        role: { id: 'role-1', name: 'Inspector', scope: 'SITE' },
      });

      await expect(service.validateCode('abc123')).rejects.toThrow(
        'no longer valid',
      );
      // validateCode no longer mutates status on date-expiry — expiry is
      // derived from `expiresOn`.
      expect(mockBypassTx.invitation.update).not.toHaveBeenCalled();
      expect(mockBypassTx.invitation.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('createBulk (grouped)', () => {
    const mockPerson = { id: 'person-1', email: 'admin@example.com' };
    const mockAccessGrant = {
      clientId: 'client-1',
      scopeAllows: jest.fn().mockReturnValue(false),
    };

    beforeEach(() => {
      mockApiClsService.requirePerson.mockReturnValue(mockPerson);
      mockApiClsService.requireAccessGrant.mockReturnValue(mockAccessGrant);
    });

    it('should send one email for grouped invitations with same email', async () => {
      const dto: CreateInvitationsDto = {
        invitations: [
          { email: 'user@example.com', siteId: 'site-1', roleId: 'role-1' },
          { email: 'user@example.com', siteId: 'site-2', roleId: 'role-2' },
        ],
      };

      mockBuildResult.site.findMany.mockResolvedValue([
        { id: 'site-1', clientId: 'client-1' },
        { id: 'site-2', clientId: 'client-1' },
      ]);
      mockBuildResult.role.findMany.mockResolvedValue([
        { id: 'role-1' },
        { id: 'role-2' },
      ]);

      mockBypassTx.invitation.createManyAndReturn.mockResolvedValue([
        { id: 'inv-1' },
        { id: 'inv-2' },
      ]);
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([]);
      mockBypassTx.invitation.findMany.mockResolvedValueOnce([
        {
          id: 'inv-1',
          code: 'mock-nanoid1',
          email: 'user@example.com',
          groupId: 'mock-nanoid1',
          client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
          site: { name: 'Site A', id: 'site-1' },
          role: { name: 'Inspector', id: 'role-1', scope: 'SITE' },
          createdBy: { firstName: 'Admin', lastName: 'User', id: 'person-1' },
          acceptedBy: null,
          expiresOn: new Date('2025-01-08'),
        },
        {
          id: 'inv-2',
          code: 'mock-nanoid1',
          email: 'user@example.com',
          groupId: 'mock-nanoid1',
          client: { name: 'Test Client', id: 'client-1', externalId: 'ext-1' },
          site: { name: 'Site B', id: 'site-2' },
          role: { name: 'Manager', id: 'role-2', scope: 'SITE' },
          createdBy: { firstName: 'Admin', lastName: 'User', id: 'person-1' },
          acceptedBy: null,
          expiresOn: new Date('2025-01-08'),
        },
      ]);

      await service.createBulk(dto);

      // Should send ONE email (grouped) instead of two
      expect(mockNotificationsService.queueEmailBulk).toHaveBeenCalledWith([
        expect.objectContaining({
          templateName: 'invitation',
          to: ['user@example.com'],
          templateProps: expect.objectContaining({
            assignments: [
              { siteName: 'Site A', roleName: 'Inspector' },
              { siteName: 'Site B', roleName: 'Manager' },
            ],
          }),
        }),
      ]);
    });
  });
});
