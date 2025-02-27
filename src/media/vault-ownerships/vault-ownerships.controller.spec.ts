import { Test, TestingModule } from '@nestjs/testing';
import { VaultOwnershipsController } from './vault-ownerships.controller';
import { VaultOwnershipsService } from './vault-ownerships.service';

describe('VaultOwnershipsController', () => {
  let controller: VaultOwnershipsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VaultOwnershipsController],
      providers: [VaultOwnershipsService],
    }).compile();

    controller = module.get<VaultOwnershipsController>(VaultOwnershipsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
