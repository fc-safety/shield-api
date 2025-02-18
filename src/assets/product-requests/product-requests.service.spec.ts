import { Test, TestingModule } from '@nestjs/testing';
import { ProductRequestsService } from './product-requests.service';

describe('ProductRequestsService', () => {
  let service: ProductRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductRequestsService],
    }).compile();

    service = module.get<ProductRequestsService>(ProductRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
