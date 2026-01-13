import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('StatsService', () => {
  let service: StatsService;

  const mockPrismaService = {
    forContext: jest.fn().mockResolvedValue({
      asset: {
        findMany: jest.fn(),
      },
      inspection: {
        findMany: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
