import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { LegacyMigrationController } from './legacy-migration.controller';
import { LegacyMigrationGateway } from './legacy-migration.gateway';
import { LegacyMigrationService } from './legacy-migration.service';

@Module({
  imports: [AuthModule],
  controllers: [LegacyMigrationController],
  providers: [LegacyMigrationService, LegacyMigrationGateway],
})
export class LegacyMigrationModule {}
