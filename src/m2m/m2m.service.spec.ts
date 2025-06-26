import { Test, TestingModule } from '@nestjs/testing';
import { M2mService } from './m2m.service';

describe('M2mService', () => {
  let service: M2mService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [M2mService],
    }).compile();

    service = module.get<M2mService>(M2mService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
