import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CheckPolicies } from 'src/auth/policies.guard';
import { GLOBAL_SETTINGS_FRIENDLY_ID } from './constants';
import { GlobalSettingsDto } from './dto/global-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@CheckPolicies(({ user }) => user.isGlobalAdmin())
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(GLOBAL_SETTINGS_FRIENDLY_ID)
  getGlobalSettings() {
    return this.settingsService.getGlobalSettings();
  }

  @Patch(GLOBAL_SETTINGS_FRIENDLY_ID)
  updateGlobalSettings(@Body() globalSettingsDto: GlobalSettingsDto) {
    return this.settingsService.updateGlobalSettings(globalSettingsDto);
  }
}
