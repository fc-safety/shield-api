import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { RoleScope } from 'src/generated/prisma/client';
import { PrismaService, shouldBypassRLS } from 'src/prisma/prisma.service';
import { AuthService } from './auth.service';

describe('Access context resolver', () => {
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
      if (key === 'SYSTEM_ADMIN_EMAILS') return [];
      return 'test-value';
    }),
  };

  const mockMemoryCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getOrSet: jest.fn(),
  };

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({}),
  };

  beforeEach(async () => {
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

  it('keeps support mode tenant-scoped while system mode bypasses RLS', () => {
    const user = {
      idpId: 'idp-user-1',
      email: 'user@example.com',
      username: 'user',
      givenName: 'Test',
      familyName: 'User',
    } as const;
    const person = { id: 'person-1' } as any;
    const accessGrant = {
      scope: RoleScope.SYSTEM,
      capabilities: [],
      clientId: 'client-1',
      siteId: 'site-1',
      roleId: 'role-system',
    };

    const supportContext = service.resolveAccessContext({
      user,
      person,
      accessGrant,
      accessIntent: 'elevated',
    });
    const systemContext = service.resolveAccessContext({
      user,
      person,
      accessGrant,
      accessIntent: 'system',
    });

    expect(supportContext.kind).toBe('support');
    expect(systemContext.kind).toBe('system');

    expect(
      shouldBypassRLS({ mode: 'request', accessContextKind: supportContext.kind }),
    ).toBe(false);
    expect(
      shouldBypassRLS({ mode: 'request', accessContextKind: systemContext.kind }),
    ).toBe(true);
  });
});
