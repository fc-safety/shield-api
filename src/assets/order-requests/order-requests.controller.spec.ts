import { Test, TestingModule } from '@nestjs/testing';
import { OrderRequestsController } from './order-requests.controller';
import { OrderRequestsService } from './order-requests.service';

describe('OrderRequestsController', () => {
  let controller: OrderRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderRequestsController],
      providers: [OrderRequestsService],
    }).compile();

    controller = module.get<OrderRequestsController>(OrderRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
