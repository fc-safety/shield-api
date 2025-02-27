import { Test, TestingModule } from '@nestjs/testing';
import { VaultOwnershipsService } from './vault-ownerships.service';

describe('VaultOwnershipsService', () => {
  let service: VaultOwnershipsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VaultOwnershipsService],
    }).compile();

    service = module.get<VaultOwnershipsService>(VaultOwnershipsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
