import { Test, TestingModule } from '@nestjs/testing';
import { SitesService } from './sites.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

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

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<SitesService>(SitesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
