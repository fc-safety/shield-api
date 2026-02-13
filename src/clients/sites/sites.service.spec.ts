import { Test, TestingModule } from '@nestjs/testing';
import { SitesService } from './sites.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';

describe('SitesService', () => {
  let service: SitesService;

  const mockPrismaService = {
    forContext: jest.fn().mockResolvedValue({
      site: {
        create: jest.fn(),
        findManyForPage: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    }),
    bypassRLS: jest.fn().mockReturnValue({
      site: {
        findUnique: jest.fn(),
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
        SitesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MemoryCacheService, useValue: mockMemoryCacheService },
      ],
    }).compile();

    service = module.get<SitesService>(SitesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
