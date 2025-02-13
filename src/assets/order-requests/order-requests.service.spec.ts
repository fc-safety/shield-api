import { Test, TestingModule } from '@nestjs/testing';
import { OrderRequestsService } from './order-requests.service';

describe('OrderRequestsService', () => {
  let service: OrderRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderRequestsService],
    }).compile();

    service = module.get<OrderRequestsService>(OrderRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
