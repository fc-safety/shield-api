import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientAccessService } from './client-access.service';

describe('ClientAccessService', () => {
  let service: ClientAccessService;
  let mockPrismaService: any;
  let mockClsService: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockPrismaService = {
      bypassRLS: jest.fn(),
    };

    mockClsService = {
      get: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientAccessService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ClsService, useValue: mockClsService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ClientAccessService>(ClientAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyClientAccess', () => {
    it('should return empty array when user is not set', async () => {
      mockClsService.get.mockReturnValue(undefined);

      const result = await service.getMyClientAccess();

      expect(result).toEqual([]);
    });

    it('should return client access entries for current user', async () => {
      const mockAccesses = [
        {
          id: 'access-1',
          client: { id: 'client-1', externalId: 'ext-1', name: 'Client 1' },
          site: { id: 'site-1', externalId: 'ext-site-1', name: 'Site 1' },
          role: { id: 'role-1', name: 'Admin', description: null },
        },
      ];

      mockClsService.get.mockReturnValue({ idpId: 'user-idp-1' });
      mockPrismaService.bypassRLS.mockReturnValue({
        personClientAccess: {
          findMany: jest.fn().mockResolvedValue(mockAccesses),
        },
      });

      const result = await service.getMyClientAccess();

      expect(result).toEqual(mockAccesses);
    });
  });

  describe('grantClientAccess', () => {
    it('should throw NotFoundException when person does not exist', async () => {
      mockPrismaService.bypassRLS.mockReturnValue({
        person: { findUnique: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.grantClientAccess('person-1', {
          clientId: 'client-1',
          siteId: 'site-1',
          roleId: 'role-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when access already exists', async () => {
      mockPrismaService.bypassRLS.mockReturnValue({
        person: { findUnique: jest.fn().mockResolvedValue({ id: 'person-1' }) },
        client: { findUnique: jest.fn().mockResolvedValue({ id: 'client-1' }) },
        site: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'site-1', clientId: 'client-1' }),
        },
        role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1' }) },
        personClientAccess: {
          findUnique: jest.fn().mockResolvedValue({ id: 'existing-access' }),
        },
      });

      await expect(
        service.grantClientAccess('person-1', {
          clientId: 'client-1',
          siteId: 'site-1',
          roleId: 'role-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create access and invalidate cache', async () => {
      const mockAccess = {
        id: 'new-access',
        personId: 'person-1',
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-1',
        client: { id: 'client-1', externalId: 'ext-1', name: 'Client 1' },
        site: { id: 'site-1', externalId: 'ext-site-1', name: 'Site 1' },
        role: { id: 'role-1', name: 'Admin', description: null },
      };

      mockPrismaService.bypassRLS.mockReturnValue({
        person: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'person-1', idpId: 'idp-1' }),
        },
        client: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'client-1', externalId: 'ext-1' }),
        },
        site: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'site-1', clientId: 'client-1' }),
        },
        role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1' }) },
        personClientAccess: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockAccess),
        },
      });

      const result = await service.grantClientAccess('person-1', {
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-1',
      });

      expect(result).toEqual(mockAccess);
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        'client-access:idp-1:ext-1',
      );
    });
  });

  describe('revokeClientAccess', () => {
    it('should throw NotFoundException when access does not exist', async () => {
      mockPrismaService.bypassRLS.mockReturnValue({
        personClientAccess: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(service.revokeClientAccess('access-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete access and invalidate cache', async () => {
      const mockDelete = jest.fn();
      mockPrismaService.bypassRLS.mockReturnValue({
        personClientAccess: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'access-1',
            person: { idpId: 'idp-1' },
            client: { externalId: 'ext-1' },
          }),
          delete: mockDelete,
        },
      });

      await service.revokeClientAccess('access-1');

      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'access-1' } });
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        'client-access:idp-1:ext-1',
      );
    });
  });
});
