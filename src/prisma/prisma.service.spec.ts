import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { ApiClsService } from 'src/auth/api-cls.service';
import { RedisService } from 'src/redis/redis.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { PrismaAdapter } from './prisma.adapter';

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
});
