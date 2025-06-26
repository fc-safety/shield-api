import { Test, TestingModule } from '@nestjs/testing';
import { LegacyMigrationGateway } from './legacy-migration.gateway';

describe('LegacyMigrationGateway', () => {
  let provider: LegacyMigrationGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LegacyMigrationGateway],
    }).compile();

    provider = module.get<LegacyMigrationGateway>(LegacyMigrationGateway);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
