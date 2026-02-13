import { Test, TestingModule } from '@nestjs/testing';
import { AssetQuestionsService } from './asset-questions.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiClsService } from 'src/auth/api-cls.service';

describe('AssetQuestionsService', () => {
  let service: AssetQuestionsService;

  const mockPrismaService = {
    forContext: jest.fn().mockResolvedValue({
      assetQuestion: {
        create: jest.fn(),
        findManyForPage: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    }),
  };

  const mockApiClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetQuestionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApiClsService, useValue: mockApiClsService },
      ],
    }).compile();

    service = module.get<AssetQuestionsService>(AssetQuestionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
