import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({
      settingsBlock: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    }),
  };

  const mockMemoryCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    mdel: jest.fn(),
    getOrSet: jest.fn(),
    wrap: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MemoryCacheService, useValue: mockMemoryCacheService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
