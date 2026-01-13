import { Test, TestingModule } from '@nestjs/testing';
import { LegacyMigrationGateway } from './legacy-migration.gateway';
import { LegacyMigrationService } from './legacy-migration.service';

describe('LegacyMigrationGateway', () => {
  let provider: LegacyMigrationGateway;

  const mockLegacyMigrationService = {
    validateWsToken: jest.fn(),
    processMigration: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegacyMigrationGateway,
        {
          provide: LegacyMigrationService,
          useValue: mockLegacyMigrationService,
        },
      ],
    }).compile();

    provider = module.get<LegacyMigrationGateway>(LegacyMigrationGateway);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
