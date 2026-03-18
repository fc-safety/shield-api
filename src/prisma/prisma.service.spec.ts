import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { ApiClsService } from 'src/auth/api-cls.service';
import { RedisService } from 'src/redis/redis.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { PrismaAdapter } from './prisma.adapter';
import {
  buildRLSContextStatements,
  IPrismaRLSContext,
  shouldBypassRLS,
} from './prisma.service';
import { RoleScope } from 'src/generated/prisma/client';

describe('PrismaService', () => {
  let service: PrismaService;

  const mockApiClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockRedisService = {
    getPublisher: jest.fn().mockReturnValue({
      get: jest.fn(),
      set: jest.fn(),
    }),
  };

  const mockMemoryCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    getOrSet: jest.fn(),
  };

  const mockPrismaAdapter = {
    getConnectionUrl: jest
      .fn()
      .mockReturnValue('postgresql://localhost:5432/test'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: MemoryCacheService, useValue: mockMemoryCacheService },
        { provide: PrismaAdapter, useValue: mockPrismaAdapter },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildRLSContextStatements', () => {
    const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
    const mockPrismaClient = {
      $executeRaw: mockExecuteRaw,
    } as any;
    const rlsContext: IPrismaRLSContext = {
      personId: 'person-1',
      clientId: 'client-1',
      siteId: 'site-1',
      allowedSiteIds: ['site-1', 'site-2'],
      allowedSiteIdsStr: 'site-1,site-2',
      scope: RoleScope.SITE,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates tenant/support RLS statements when bypass is false', () => {
      const statements = buildRLSContextStatements(
        mockPrismaClient,
        false,
        rlsContext,
      );

      expect(statements).toHaveLength(5);
      expect(mockExecuteRaw).toHaveBeenCalledTimes(5);
    });

    it('creates a bypass statement when bypass is true', () => {
      const statements = buildRLSContextStatements(mockPrismaClient, true);

      expect(statements).toHaveLength(1);
      expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
    });

    it('throws when non-bypass context does not include RLS context', () => {
      expect(() =>
        buildRLSContextStatements(mockPrismaClient, false, undefined as any),
      ).toThrow('RLS context is required when RLS is not bypassed');
    });
  });

  describe('shouldBypassRLS', () => {
    it('does not bypass for tenant context in request mode', () => {
      expect(
        shouldBypassRLS({ mode: 'request', accessContextKind: 'tenant' }),
      ).toBe(false);
    });

    it('does not bypass for support context in request mode', () => {
      expect(
        shouldBypassRLS({ mode: 'request', accessContextKind: 'support' }),
      ).toBe(false);
    });

    it('bypasses for system context in request mode', () => {
      expect(
        shouldBypassRLS({ mode: 'request', accessContextKind: 'system' }),
      ).toBe(true);
    });

    it('bypasses in cron mode regardless of access context kind', () => {
      expect(shouldBypassRLS({ mode: 'cron', accessContextKind: 'tenant' })).toBe(
        true,
      );
    });
  });
});
