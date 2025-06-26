import { Test, TestingModule } from '@nestjs/testing';
import { LegacyMigrationService } from './legacy-migration.service';

describe('LegacyMigrationService', () => {
  let service: LegacyMigrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LegacyMigrationService],
    }).compile();

    service = module.get<LegacyMigrationService>(LegacyMigrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
