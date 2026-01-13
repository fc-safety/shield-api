import { Test, TestingModule } from '@nestjs/testing';
import { ProductRequestsController } from './product-requests.controller';
import { ProductRequestsService } from './product-requests.service';

describe('ProductRequestsController', () => {
  let controller: ProductRequestsController;

  const mockProductRequestsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatuses: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    cancel: jest.fn(),
    review: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductRequestsController],
      providers: [
        {
          provide: ProductRequestsService,
          useValue: mockProductRequestsService,
        },
      ],
    }).compile();

    controller = module.get<ProductRequestsController>(
      ProductRequestsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
