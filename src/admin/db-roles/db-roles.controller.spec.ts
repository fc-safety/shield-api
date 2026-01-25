import { Test, TestingModule } from '@nestjs/testing';
import { DbRolesController } from './db-roles.controller';
import { DbRolesService } from './db-roles.service';

describe('DbRolesController', () => {
  let controller: DbRolesController;

  const mockDbRolesService = {
    listRoles: jest.fn(),
    getRole: jest.fn(),
    createRole: jest.fn(),
    updateRole: jest.fn(),
    deleteRole: jest.fn(),
    addPermissions: jest.fn(),
    removePermission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DbRolesController],
      providers: [{ provide: DbRolesService, useValue: mockDbRolesService }],
    }).compile();

    controller = module.get<DbRolesController>(DbRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listRoles', () => {
    it('should return all roles', async () => {
      const mockRoles = [{ id: 'role-1' }];
      mockDbRolesService.listRoles.mockResolvedValue(mockRoles);

      const result = await controller.listRoles();

      expect(result).toEqual(mockRoles);
    });

    it('should filter by clientId', async () => {
      mockDbRolesService.listRoles.mockResolvedValue([]);

      await controller.listRoles('client-1');

      expect(mockDbRolesService.listRoles).toHaveBeenCalledWith('client-1');
    });
  });

  describe('getRole', () => {
    it('should return a role by id', async () => {
      const mockRole = { id: 'role-1', name: 'Admin' };
      mockDbRolesService.getRole.mockResolvedValue(mockRole);

      const result = await controller.getRole('role-1');

      expect(result).toEqual(mockRole);
    });
  });

  describe('createRole', () => {
    it('should create a role', async () => {
      const dto = { name: 'New Role', isSystem: false };
      const mockRole = { id: 'new-role', ...dto };
      mockDbRolesService.createRole.mockResolvedValue(mockRole);

      const result = await controller.createRole(dto);

      expect(result).toEqual(mockRole);
    });
  });

  describe('updateRole', () => {
    it('should update a role', async () => {
      const dto = { name: 'Updated Role' };
      const mockRole = { id: 'role-1', ...dto };
      mockDbRolesService.updateRole.mockResolvedValue(mockRole);

      const result = await controller.updateRole('role-1', dto);

      expect(result).toEqual(mockRole);
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      mockDbRolesService.deleteRole.mockResolvedValue(undefined);

      await controller.deleteRole('role-1');

      expect(mockDbRolesService.deleteRole).toHaveBeenCalledWith('role-1');
    });
  });

  describe('addPermissions', () => {
    it('should add permissions to a role', async () => {
      const dto = { permissions: ['read:assets'] };
      const mockRole = {
        id: 'role-1',
        permissions: [{ permission: 'read:assets' }],
      };
      mockDbRolesService.addPermissions.mockResolvedValue(mockRole);

      const result = await controller.addPermissions('role-1', dto);

      expect(result).toEqual(mockRole);
    });
  });

  describe('removePermission', () => {
    it('should remove a permission from a role', async () => {
      mockDbRolesService.removePermission.mockResolvedValue(undefined);

      await controller.removePermission('role-1', 'read:assets');

      expect(mockDbRolesService.removePermission).toHaveBeenCalledWith(
        'role-1',
        'read:assets',
      );
    });
  });
});
