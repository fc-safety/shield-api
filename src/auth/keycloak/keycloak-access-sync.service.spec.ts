import { Test, TestingModule } from '@nestjs/testing';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { KeycloakAccessSyncService } from './keycloak-access-sync.service';
import { KeycloakService } from './keycloak.service';

describe('KeycloakAccessSyncService', () => {
  let service: KeycloakAccessSyncService;
  let mockKeycloakService: Record<string, jest.Mock>;
  let mockConfig: Record<string, jest.Mock>;
  let mockPrismaBypass: Record<string, any>;
  let mockPrismaService: Record<string, any>;

  beforeEach(async () => {
    mockKeycloakService = {
      getManagedRoleSubgroups: jest.fn(),
      findUsersByAttribute: jest.fn(),
      listUserGroups: jest.fn(),
    };

    mockConfig = {
      get: jest.fn(),
    };

    mockPrismaBypass = {
      role: { findMany: jest.fn().mockResolvedValue([]) },
      client: { findMany: jest.fn().mockResolvedValue([]) },
      site: { findMany: jest.fn().mockResolvedValue([]) },
      person: { upsert: jest.fn() },
      personClientAccess: { count: jest.fn(), upsert: jest.fn() },
      $transaction: jest.fn((cb) => cb(mockPrismaBypass)),
    };

    mockPrismaService = {
      bypassRLS: jest.fn().mockReturnValue(mockPrismaBypass),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakAccessSyncService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: ApiConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<KeycloakAccessSyncService>(KeycloakAccessSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleSync', () => {
    it('should skip sync when config is disabled', async () => {
      mockConfig.get.mockReturnValue(false);

      await service.handleSync();

      expect(
        mockKeycloakService.getManagedRoleSubgroups,
      ).not.toHaveBeenCalled();
    });

    it('should call runSync when config is enabled', async () => {
      mockConfig.get.mockReturnValue(true);
      mockKeycloakService.getManagedRoleSubgroups.mockResolvedValue([]);

      await service.handleSync();

      expect(mockKeycloakService.getManagedRoleSubgroups).toHaveBeenCalled();
    });

    it('should catch and log errors without throwing', async () => {
      mockConfig.get.mockReturnValue(true);
      mockKeycloakService.getManagedRoleSubgroups.mockRejectedValue(
        new Error('connection failed'),
      );

      await expect(service.handleSync()).resolves.toBeUndefined();
    });
  });

  describe('runSync', () => {
    it('should abort when no subgroups have shield_role_id attribute', async () => {
      mockKeycloakService.getManagedRoleSubgroups.mockResolvedValue([
        { id: 'group-1', name: 'some-group', attributes: {} },
      ]);
      mockPrismaBypass.role.findMany.mockResolvedValue([]);

      await service.runSync();

      expect(mockKeycloakService.findUsersByAttribute).not.toHaveBeenCalled();
    });

    it('should abort when no subgroups exist', async () => {
      mockKeycloakService.getManagedRoleSubgroups.mockResolvedValue([]);
      mockPrismaBypass.role.findMany.mockResolvedValue([]);

      await service.runSync();

      expect(mockKeycloakService.findUsersByAttribute).not.toHaveBeenCalled();
    });

    it('should sync users with matching role groups and attributes', async () => {
      const dbRoleId = 'db-role-1';
      const kcGroupId = 'kc-group-1';

      mockKeycloakService.getManagedRoleSubgroups.mockResolvedValue([
        {
          id: kcGroupId,
          name: 'inspector',
          attributes: { shield_role_id: [dbRoleId] },
        },
      ]);

      mockPrismaBypass.role.findMany.mockResolvedValue([
        { id: dbRoleId, name: 'Inspector' },
      ]);

      mockPrismaBypass.client.findMany.mockResolvedValue([
        { id: 'client-db-id', externalId: 'client-ext-1' },
      ]);

      mockPrismaBypass.site.findMany.mockResolvedValue([
        { id: 'site-db-id', externalId: 'site-ext-1' },
      ]);

      mockKeycloakService.findUsersByAttribute.mockResolvedValue({
        limit: 100,
        offset: 0,
        count: 1,
        results: [
          {
            id: 'kc-user-1',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            attributes: {
              client_id: ['client-ext-1'],
              site_id: ['site-ext-1'],
            },
          },
        ],
      });

      mockKeycloakService.listUserGroups.mockResolvedValue([
        { id: kcGroupId, name: 'inspector' },
      ]);

      mockPrismaBypass.person.upsert.mockResolvedValue({
        id: 'person-db-id',
      });
      mockPrismaBypass.personClientAccess.count.mockResolvedValue(0);
      mockPrismaBypass.personClientAccess.upsert.mockResolvedValue({});

      await service.runSync();

      expect(mockPrismaBypass.person.upsert).toHaveBeenCalledWith({
        where: { idpId: 'kc-user-1' },
        create: {
          idpId: 'kc-user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'user@example.com',
        },
        update: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'user@example.com',
        },
      });

      expect(mockPrismaBypass.personClientAccess.upsert).toHaveBeenCalledWith({
        where: {
          personId_clientId_siteId_roleId: {
            personId: 'person-db-id',
            clientId: 'client-db-id',
            siteId: 'site-db-id',
            roleId: dbRoleId,
          },
        },
        create: {
          personId: 'person-db-id',
          clientId: 'client-db-id',
          siteId: 'site-db-id',
          roleId: dbRoleId,
          isPrimary: true,
        },
        update: {},
      });
    });

    it('should skip users without client_id or site_id attributes', async () => {
      mockKeycloakService.getManagedRoleSubgroups.mockResolvedValue([
        {
          id: 'kc-group-1',
          name: 'inspector',
          attributes: { shield_role_id: ['db-role-1'] },
        },
      ]);

      mockPrismaBypass.role.findMany.mockResolvedValue([
        { id: 'db-role-1', name: 'Inspector' },
      ]);
      mockPrismaBypass.client.findMany.mockResolvedValue([]);
      mockPrismaBypass.site.findMany.mockResolvedValue([]);

      mockKeycloakService.findUsersByAttribute.mockResolvedValue({
        limit: 100,
        offset: 0,
        count: 2,
        results: [
          {
            id: 'user-no-attrs',
            email: 'noattr@example.com',
            attributes: {},
          },
          {
            id: 'user-partial',
            email: 'partial@example.com',
            attributes: { client_id: ['some-client'] },
          },
        ],
      });

      await service.runSync();

      expect(mockPrismaBypass.person.upsert).not.toHaveBeenCalled();
    });

    it('should set isPrimary for all roles when user has no existing access', async () => {
      const dbRoleId1 = 'db-role-1';
      const dbRoleId2 = 'db-role-2';
      const kcGroupId1 = 'kc-group-1';
      const kcGroupId2 = 'kc-group-2';

      mockKeycloakService.getManagedRoleSubgroups.mockResolvedValue([
        {
          id: kcGroupId1,
          name: 'inspector',
          attributes: { shield_role_id: [dbRoleId1] },
        },
        {
          id: kcGroupId2,
          name: 'manager',
          attributes: { shield_role_id: [dbRoleId2] },
        },
      ]);

      mockPrismaBypass.role.findMany.mockResolvedValue([
        { id: dbRoleId1, name: 'Inspector' },
        { id: dbRoleId2, name: 'Manager' },
      ]);

      mockPrismaBypass.client.findMany.mockResolvedValue([
        { id: 'client-db-id', externalId: 'client-ext-1' },
      ]);

      mockPrismaBypass.site.findMany.mockResolvedValue([
        { id: 'site-db-id', externalId: 'site-ext-1' },
      ]);

      mockKeycloakService.findUsersByAttribute.mockResolvedValue({
        limit: 100,
        offset: 0,
        count: 1,
        results: [
          {
            id: 'kc-user-1',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            attributes: {
              client_id: ['client-ext-1'],
              site_id: ['site-ext-1'],
            },
          },
        ],
      });

      mockKeycloakService.listUserGroups.mockResolvedValue([
        { id: kcGroupId1, name: 'inspector' },
        { id: kcGroupId2, name: 'manager' },
      ]);

      mockPrismaBypass.person.upsert.mockResolvedValue({
        id: 'person-db-id',
      });
      mockPrismaBypass.personClientAccess.count.mockResolvedValue(0);
      mockPrismaBypass.personClientAccess.upsert.mockResolvedValue({});

      await service.runSync();

      const upsertCalls = mockPrismaBypass.personClientAccess.upsert.mock.calls;
      expect(upsertCalls).toHaveLength(2);

      // All roles for the first client/site are primary
      expect(upsertCalls[0][0].create.isPrimary).toBe(true);
      expect(upsertCalls[1][0].create.isPrimary).toBe(true);
    });

    it('should not set isPrimary if person already has access records', async () => {
      const kcGroupId = 'kc-group-1';

      mockKeycloakService.getManagedRoleSubgroups.mockResolvedValue([
        {
          id: kcGroupId,
          name: 'inspector',
          attributes: { shield_role_id: ['db-role-1'] },
        },
      ]);

      mockPrismaBypass.role.findMany.mockResolvedValue([
        { id: 'db-role-1', name: 'Inspector' },
      ]);

      mockPrismaBypass.client.findMany.mockResolvedValue([
        { id: 'client-db-id', externalId: 'client-ext-1' },
      ]);

      mockPrismaBypass.site.findMany.mockResolvedValue([
        { id: 'site-db-id', externalId: 'site-ext-1' },
      ]);

      mockKeycloakService.findUsersByAttribute.mockResolvedValue({
        limit: 100,
        offset: 0,
        count: 1,
        results: [
          {
            id: 'kc-user-1',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            attributes: {
              client_id: ['client-ext-1'],
              site_id: ['site-ext-1'],
            },
          },
        ],
      });

      mockKeycloakService.listUserGroups.mockResolvedValue([
        { id: kcGroupId, name: 'inspector' },
      ]);

      mockPrismaBypass.person.upsert.mockResolvedValue({
        id: 'person-db-id',
      });
      // Person already has 2 access records
      mockPrismaBypass.personClientAccess.count.mockResolvedValue(2);
      mockPrismaBypass.personClientAccess.upsert.mockResolvedValue({});

      await service.runSync();

      expect(
        mockPrismaBypass.personClientAccess.upsert.mock.calls[0][0].create
          .isPrimary,
      ).toBe(false);
    });
  });
});
