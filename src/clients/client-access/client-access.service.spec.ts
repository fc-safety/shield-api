import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiClsService } from 'src/auth/api-cls.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientAccessService } from './client-access.service';

describe('ClientAccessService', () => {
  let service: ClientAccessService;
  let mockPrismaService: any;
  let mockApiClsService: any;
  let mockApiConfigService: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockPrismaService = {
      bypassRLS: jest.fn(),
    };

    mockApiClsService = {
      get: jest.fn(),
    };

    mockApiConfigService = {
      get: jest.fn().mockReturnValue([]),
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
        { provide: ApiConfigService, useValue: mockApiConfigService },
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

    it('should return flat client access entries for current user', async () => {
      const mockAccesses = [
        {
          client: { id: 'client-1', name: 'Client 1' },
          site: { id: 'site-1', name: 'Site 1' },
          role: { scope: 'CLIENT', capabilities: ['manage-assets'] },
        },
      ];

      mockApiClsService.get.mockReturnValue({ idpId: 'user-idp-1' });
      mockPrismaService.bypassRLS.mockReturnValue({
        personClientAccess: {
          findMany: jest.fn().mockResolvedValue(mockAccesses),
        },
      });

      const result = await service.getMyClientAccess();

      expect(result).toEqual([
        {
          clientId: 'client-1',
          clientName: 'Client 1',
          siteId: 'site-1',
          siteName: 'Site 1',
          scope: 'CLIENT',
          capabilities: ['manage-assets'],
        },
      ]);
    });

    it('should merge roles when user has multiple accesses for same client+site', async () => {
      const mockAccesses = [
        {
          client: { id: 'client-1', name: 'Client 1' },
          site: { id: 'site-1', name: 'Site 1' },
          role: { scope: 'SITE', capabilities: ['perform-inspections'] },
        },
        {
          client: { id: 'client-1', name: 'Client 1' },
          site: { id: 'site-1', name: 'Site 1' },
          role: { scope: 'CLIENT', capabilities: ['manage-assets'] },
        },
      ];

      mockApiClsService.get.mockReturnValue({ idpId: 'user-idp-1' });
      mockPrismaService.bypassRLS.mockReturnValue({
        personClientAccess: {
          findMany: jest.fn().mockResolvedValue(mockAccesses),
        },
      });

      const result = await service.getMyClientAccess();

      expect(result).toEqual([
        {
          clientId: 'client-1',
          clientName: 'Client 1',
          siteId: 'site-1',
          siteName: 'Site 1',
          scope: 'CLIENT',
          capabilities: expect.arrayContaining([
            'perform-inspections',
            'manage-assets',
          ]),
        },
      ]);
    });
  });
});
