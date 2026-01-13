import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategoriesService } from './product-categories.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClsService } from 'nestjs-cls';

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

  const mockClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCategoriesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ClsService, useValue: mockClsService },
      ],
    }).compile();

    service = module.get<ProductCategoriesService>(ProductCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
