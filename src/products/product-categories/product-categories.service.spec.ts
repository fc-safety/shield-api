import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategoriesService } from './product-categories.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiClsService } from 'src/auth/api-cls.service';

describe('ProductCategoriesService', () => {
  let service: ProductCategoriesService;

  const mockPrismaService = {
    forContext: jest.fn().mockResolvedValue({
      productCategory: {
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
        ProductCategoriesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApiClsService, useValue: mockApiClsService },
      ],
    }).compile();

    service = module.get<ProductCategoriesService>(ProductCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
