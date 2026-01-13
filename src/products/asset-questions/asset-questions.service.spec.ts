import { Test, TestingModule } from '@nestjs/testing';
import { AssetQuestionsService } from './asset-questions.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClsService } from 'nestjs-cls';

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

  const mockClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetQuestionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ClsService, useValue: mockClsService },
      ],
    }).compile();

    service = module.get<AssetQuestionsService>(AssetQuestionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
