import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiClsService } from 'src/auth/api-cls.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientAccessService } from './client-access.service';

describe('ClientAccessService', () => {
  let service: ClientAccessService;
  let mockPrismaService: any;
  let mockApiClsService: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockPrismaService = {
      bypassRLS: jest.fn(),
    };

    mockApiClsService = {
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
        { provide: ApiClsService, useValue: mockApiClsService },
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
      mockApiClsService.get.mockReturnValue(undefined);

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

      mockApiClsService.get.mockReturnValue({ idpId: 'user-idp-1' });
      mockPrismaService.bypassRLS.mockReturnValue({
        personClientAccess: {
          findMany: jest.fn().mockResolvedValue(mockAccesses),
        },
      });

      const result = await service.getMyClientAccess();

      expect(result).toEqual(mockAccesses);
    });
  });
});
