import { Controller, Get } from '@nestjs/common';
import { CheckPolicies } from 'src/auth/policies.guard';
import { LegacyMigrationService } from './legacy-migration.service';

@Controller('legacy-migration')
@CheckPolicies(({ user }) => user.isSystemAdmin())
export class LegacyMigrationController {
  constructor(
    private readonly legacyMigrationService: LegacyMigrationService,
  ) {}

  @Get('ws-token')
  async getWsToken() {
    return {
      token: await this.legacyMigrationService.getWsToken(),
    };
  }
}
