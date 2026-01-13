import { Test, TestingModule } from '@nestjs/testing';
import { AnsiCategoriesService } from './ansi-categories.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('AnsiCategoriesService', () => {
  let service: AnsiCategoriesService;

  const mockPrismaService = {
    forUser: jest.fn().mockResolvedValue({
      ansiCategory: {
        create: jest.fn(),
        findManyForPage: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnsiCategoriesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnsiCategoriesService>(AnsiCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
