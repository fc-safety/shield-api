import { Test, TestingModule } from '@nestjs/testing';
import { LegacyMigrationController } from './legacy-migration.controller';

describe('LegacyMigrationController', () => {
  let controller: LegacyMigrationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegacyMigrationController],
    }).compile();

    controller = module.get<LegacyMigrationController>(
      LegacyMigrationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
