import { Test, TestingModule } from '@nestjs/testing';
import { LegacyMigrationService } from './legacy-migration.service';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiConfigService } from 'src/config/api-config.service';

describe('LegacyMigrationService', () => {
  let service: LegacyMigrationService;

  const mockAuthService = {
    validateToken: jest.fn(),
  };

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({
      client: {
        findUnique: jest.fn(),
      },
    }),
  };

  const mockApiConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const mockValues: Record<string, any> = {
        LEGACY_DB_HOST: 'localhost',
        LEGACY_DB_USER: 'test',
        LEGACY_DB_PASSWORD: 'test',
        LEGACY_DB_NAME: 'test',
        LEGACY_DB_PORT: 3306,
      };
      return mockValues[key] || 'test-value';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegacyMigrationService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
      ],
    }).compile();

    service = module.get<LegacyMigrationService>(LegacyMigrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
