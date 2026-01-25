import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { DbRolesService } from './db-roles.service';

describe('DbRolesService', () => {
  let service: DbRolesService;
  let mockPrismaService: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockPrismaService = {
      bypassRLS: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DbRolesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<DbRolesService>(DbRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listRoles', () => {
    it('should return all roles', async () => {
      const mockRoles = [
        { id: 'role-1', name: 'Admin', permissions: [] },
        { id: 'role-2', name: 'User', permissions: [] },
      ];

      mockPrismaService.bypassRLS.mockReturnValue({
        role: {
          findMany: jest.fn().mockResolvedValue(mockRoles),
        },
      });

      const result = await service.listRoles();

      expect(result).toEqual(mockRoles);
    });

    it('should filter by clientId when provided', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockPrismaService.bypassRLS.mockReturnValue({
        role: {
          findMany: mockFindMany,
        },
      });

      await service.listRoles('client-1');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: 'client-1' },
        }),
      );
    });
  });

  describe('createRole', () => {
    it('should create a role', async () => {
      const mockRole = {
        id: 'new-role',
        name: 'New Role',
        description: null,
        permissions: [],
      };

      mockPrismaService.bypassRLS.mockReturnValue({
        client: { findUnique: jest.fn().mockResolvedValue(null) },
        role: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockRole),
        },
      });

      const result = await service.createRole({
        name: 'New Role',
        isSystem: false,
      });

      expect(result).toEqual(mockRole);
    });

    it('should throw BadRequestException for duplicate name', async () => {
      mockPrismaService.bypassRLS.mockReturnValue({
        client: { findUnique: jest.fn().mockResolvedValue(null) },
        role: {
          findFirst: jest.fn().mockResolvedValue({ id: 'existing-role' }),
        },
      });

      await expect(
        service.createRole({ name: 'Existing Role', isSystem: false }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteRole', () => {
    it('should throw NotFoundException when role does not exist', async () => {
      mockPrismaService.bypassRLS.mockReturnValue({
        role: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(service.deleteRole('role-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for system roles', async () => {
      mockPrismaService.bypassRLS.mockReturnValue({
        role: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'role-1',
            isSystem: true,
            _count: { personClientAccess: 0 },
          }),
        },
      });

      await expect(service.deleteRole('role-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when role has assignments', async () => {
      mockPrismaService.bypassRLS.mockReturnValue({
        role: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'role-1',
            isSystem: false,
            _count: { personClientAccess: 5 },
          }),
        },
      });

      await expect(service.deleteRole('role-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete role when valid', async () => {
      const mockDelete = jest.fn();
      mockPrismaService.bypassRLS.mockReturnValue({
        role: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'role-1',
            isSystem: false,
            _count: { personClientAccess: 0 },
          }),
          delete: mockDelete,
        },
      });

      await service.deleteRole('role-1');

      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
    });
  });

  describe('addPermissions', () => {
    it('should add new permissions', async () => {
      const mockRole = {
        id: 'role-1',
        name: 'Admin',
        permissions: [
          { id: 'perm-1', permission: 'read:assets' },
          { id: 'perm-2', permission: 'write:assets' },
        ],
      };

      mockPrismaService.bypassRLS.mockReturnValue({
        role: {
          findUnique: jest.fn().mockResolvedValue({ id: 'role-1' }),
        },
        rolePermission: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ permission: 'read:assets' }]),
          createMany: jest.fn(),
        },
      });

      // Mock getRole for return value
      jest.spyOn(service, 'getRole').mockResolvedValue(mockRole as any);

      const result = await service.addPermissions('role-1', {
        permissions: ['read:assets', 'write:assets'],
      });

      expect(result).toEqual(mockRole);
    });

    it('should invalidate cache after adding permissions', async () => {
      mockPrismaService.bypassRLS.mockReturnValue({
        role: {
          findUnique: jest.fn().mockResolvedValue({ id: 'role-1' }),
        },
        rolePermission: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn(),
        },
      });

      jest.spyOn(service, 'getRole').mockResolvedValue({ id: 'role-1' } as any);

      await service.addPermissions('role-1', {
        permissions: ['read:assets'],
      });

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        'role-permissions:role-1',
      );
    });
  });

  describe('getRolePermissions', () => {
    it('should return cached permissions if available', async () => {
      const cachedPermissions = ['read:assets', 'write:assets'];
      mockCacheManager.get.mockResolvedValue(cachedPermissions);

      const result = await service.getRolePermissions('role-1');

      expect(result).toEqual(cachedPermissions);
      expect(mockPrismaService.bypassRLS).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not cached', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockPrismaService.bypassRLS.mockReturnValue({
        rolePermission: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { permission: 'read:assets' },
              { permission: 'write:assets' },
            ]),
        },
      });

      const result = await service.getRolePermissions('role-1');

      expect(result).toEqual(['read:assets', 'write:assets']);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'role-permissions:role-1',
        ['read:assets', 'write:assets'],
        60 * 60 * 1000,
      );
    });
  });

  describe('removePermission', () => {
    it('should invalidate cache after removing permission', async () => {
      mockPrismaService.bypassRLS.mockReturnValue({
        role: {
          findUnique: jest.fn().mockResolvedValue({ id: 'role-1' }),
        },
        rolePermission: {
          findFirst: jest.fn().mockResolvedValue({ id: 'perm-1' }),
          delete: jest.fn(),
        },
      });

      await service.removePermission('role-1', 'read:assets');

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        'role-permissions:role-1',
      );
    });
  });
});
