import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ApiConfigService } from 'src/config/api-config.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { RoleScope } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildAccessGrantResponseCacheKey } from './utils/access-grants';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'AUTH_JWKS_URI')
        return 'https://example.com/.well-known/jwks.json';
      return 'test-value';
    }),
  };

  const mockMemoryCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getOrSet: jest.fn(),
  };

  const mockPersonClientAccessFindMany = jest.fn();
  const mockSiteFindFirst = jest.fn();

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({
      personClientAccess: {
        findMany: mockPersonClientAccessFindMany,
      },
      site: {
        findFirst: mockSiteFindFirst,
      },
      signingKey: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockMemoryCacheService.getOrSet.mockImplementation(
      async (_key: string, fn: () => Promise<unknown>) => await fn(),
    );
    mockApiConfigService.get.mockImplementation((key: string) => {
      if (key === 'AUTH_JWKS_URI')
        return 'https://example.com/.well-known/jwks.json';
      if (key === 'SYSTEM_ADMIN_EMAILS') return [];
      return 'test-value';
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: MemoryCacheService, useValue: mockMemoryCacheService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAccessGrantForUser', () => {
    const user = {
      idpId: 'idp-user-1',
      email: 'user@example.com',
      username: 'user',
      givenName: 'Test',
      familyName: 'User',
    };

    it('does not check system-admin grant fallback in user intent', async () => {
      const getSystemAdminAccessGrantSpy = jest
        .spyOn(service as any, 'getSystemAdminAccessGrant')
        .mockResolvedValue({
          scope: RoleScope.SYSTEM,
          capabilities: [],
          clientId: 'client-1',
          siteId: 'site-1',
          roleId: 'role-system',
        });

      mockPersonClientAccessFindMany.mockResolvedValue([]);

      const result = await service.getAccessGrantForUser(user as any, {
        requestedClientId: 'client-1',
        accessIntent: 'user',
      });

      expect(getSystemAdminAccessGrantSpy).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          reason: 'access_grant_request_denied',
        }),
      );
    });

    it('uses system-admin grant fallback in elevated intent', async () => {
      jest.spyOn(service as any, 'getSystemAdminAccessGrant').mockResolvedValue({
        scope: RoleScope.SYSTEM,
        capabilities: [],
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-system',
      });

      const result = await service.getAccessGrantForUser(user as any, {
        requestedClientId: 'client-1',
        accessIntent: 'elevated',
      });

      expect(result).toEqual({
        grant: expect.objectContaining({
          scope: RoleScope.SYSTEM,
          clientId: 'client-1',
          siteId: 'site-1',
        }),
      });
    });

    it('uses system-admin grant fallback in system intent', async () => {
      jest.spyOn(service as any, 'getSystemAdminAccessGrant').mockResolvedValue({
        scope: RoleScope.SYSTEM,
        capabilities: [],
        clientId: 'client-1',
        siteId: 'site-1',
        roleId: 'role-system',
      });

      const result = await service.getAccessGrantForUser(user as any, {
        requestedClientId: 'client-1',
        accessIntent: 'system',
      });

      expect(result).toEqual({
        grant: expect.objectContaining({
          scope: RoleScope.SYSTEM,
          clientId: 'client-1',
          siteId: 'site-1',
        }),
      });
    });
  });

  describe('resolveAccessContext', () => {
    const user = {
      idpId: 'idp-user-1',
      email: 'user@example.com',
      username: 'user',
      givenName: 'Test',
      familyName: 'User',
    } as any;
    const person = { id: 'person-1' } as any;
    const accessGrant = {
      scope: RoleScope.SYSTEM,
      capabilities: [],
      clientId: 'client-1',
      siteId: 'site-1',
      roleId: 'role-system',
    };

    it('returns tenant kind for user intent', () => {
      const resolved = service.resolveAccessContext({
        user,
        person,
        accessGrant,
        accessIntent: 'user',
      });
      expect(resolved.kind).toBe('tenant');
    });

    it('returns support kind for elevated intent', () => {
      const resolved = service.resolveAccessContext({
        user,
        person,
        accessGrant,
        accessIntent: 'elevated',
      });
      expect(resolved.kind).toBe('support');
    });

    it('returns system kind for system intent', () => {
      const resolved = service.resolveAccessContext({
        user,
        person,
        accessGrant,
        accessIntent: 'system',
      });
      expect(resolved.kind).toBe('system');
    });

    it('throws for system intent when scope is not SYSTEM', () => {
      expect(() =>
        service.resolveAccessContext({
          user,
          person,
          accessGrant: {
            ...accessGrant,
            scope: RoleScope.CLIENT,
          },
          accessIntent: 'system',
        }),
      ).toThrow(
        "Invalid access context: 'system' access intent requires SYSTEM scope.",
      );
    });

    it('throws for elevated intent when client/site identifiers are missing', () => {
      expect(() =>
        service.resolveAccessContext({
          user,
          person,
          accessGrant: {
            ...accessGrant,
            clientId: '',
            siteId: '',
          },
          accessIntent: 'elevated',
        }),
      ).toThrow(
        "Invalid access context: 'elevated' access requires non-empty client and site IDs.",
      );
    });
  });

  describe('access-grant cache keys', () => {
    it('varies by intent', () => {
      const userIntentKey = buildAccessGrantResponseCacheKey('idp-user-1', {
        requestedClientId: 'client-1',
        accessIntent: 'user',
      });
      const elevatedIntentKey = buildAccessGrantResponseCacheKey('idp-user-1', {
        requestedClientId: 'client-1',
        accessIntent: 'elevated',
      });
      const systemIntentKey = buildAccessGrantResponseCacheKey('idp-user-1', {
        requestedClientId: 'client-1',
        accessIntent: 'system',
      });

      expect(userIntentKey).not.toEqual(elevatedIntentKey);
      expect(elevatedIntentKey).not.toEqual(systemIntentKey);
      expect(userIntentKey).not.toEqual(systemIntentKey);
    });
  });
});
