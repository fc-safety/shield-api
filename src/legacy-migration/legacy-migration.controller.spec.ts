import { Test, TestingModule } from '@nestjs/testing';
import { LegacyMigrationController } from './legacy-migration.controller';
import { LegacyMigrationService } from './legacy-migration.service';

describe('LegacyMigrationController', () => {
  let controller: LegacyMigrationController;

  const mockLegacyMigrationService = {
    getWsToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegacyMigrationController],
      providers: [
        { provide: LegacyMigrationService, useValue: mockLegacyMigrationService },
      ],
    }).compile();

    controller = module.get<LegacyMigrationController>(
      LegacyMigrationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
