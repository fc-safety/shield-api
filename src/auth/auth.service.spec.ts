import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ApiConfigService } from 'src/config/api-config.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'AUTH_JWKS_URI') return 'https://example.com/.well-known/jwks.json';
      return 'test-value';
    }),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({
      signingKey: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
