import { Test, TestingModule } from '@nestjs/testing';
import { AssetQuestionsService } from './asset-questions.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiClsService } from 'src/auth/api-cls.service';

describe('AssetQuestionsService', () => {
  let service: AssetQuestionsService;
  const mockFindManyForPage = jest.fn();

  const mockPrismaService = {
    build: jest.fn().mockResolvedValue({
      $accessContextKind: 'tenant',
      assetQuestion: {
        create: jest.fn().mockResolvedValue(undefined),
        findManyForPage: mockFindManyForPage,
        findUniqueOrThrow: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      },
    }),
  };

  const mockApiClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
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

  describe('findAll', () => {
    it('includes client customizations for non-system context', async () => {
      mockPrismaService.build.mockResolvedValue({
        $accessContextKind: 'tenant',
        assetQuestion: {
          findManyForPage: mockFindManyForPage.mockResolvedValue({
            results: [],
            count: 0,
          }),
        },
      });

      await service.findAll();

      expect(mockFindManyForPage).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            clientAssetQuestionCustomizations: true,
          }),
        }),
      );
    });

    it('does not include client customizations for system context', async () => {
      mockPrismaService.build.mockResolvedValue({
        $accessContextKind: 'system',
        assetQuestion: {
          findManyForPage: mockFindManyForPage.mockResolvedValue({
            results: [],
            count: 0,
          }),
        },
      });

      await service.findAll();

      expect(mockFindManyForPage).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            clientAssetQuestionCustomizations: false,
          }),
        }),
      );
    });
  });
});
