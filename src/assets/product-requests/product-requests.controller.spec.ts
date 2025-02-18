import { Test, TestingModule } from '@nestjs/testing';
import { ProductRequestsController } from './product-requests.controller';
import { ProductRequestsService } from './product-requests.service';

describe('ProductRequestsController', () => {
  let controller: ProductRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductRequestsController],
      providers: [ProductRequestsService],
    }).compile();

    controller = module.get<ProductRequestsController>(
      ProductRequestsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
