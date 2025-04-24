import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { SettingsModule } from 'src/settings/settings.module';
import { LandingController } from './landing.controller';
import { LandingService } from './landing.service';

@Module({
  imports: [NotificationsModule, HttpModule, SettingsModule],
  controllers: [LandingController],
  providers: [LandingService],
})
export class LandingModule {}
