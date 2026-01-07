import { Test, TestingModule } from '@nestjs/testing';
import { VaultOwnershipsController } from './vault-ownerships.controller';
import { VaultOwnershipsService } from './vault-ownerships.service';

describe('VaultOwnershipsController', () => {
  let controller: VaultOwnershipsController;

  const mockVaultOwnershipsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOneByKey: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VaultOwnershipsController],
      providers: [
        { provide: VaultOwnershipsService, useValue: mockVaultOwnershipsService },
      ],
    }).compile();

    controller = module.get<VaultOwnershipsController>(
      VaultOwnershipsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
