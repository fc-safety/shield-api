import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';

describe('ProductCategoriesController', () => {
  let controller: ProductCategoriesController;

  const mockProductCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductCategoriesController],
      providers: [
        { provide: ProductCategoriesService, useValue: mockProductCategoriesService },
      ],
    }).compile();

    controller = module.get<ProductCategoriesController>(
      ProductCategoriesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
