import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RolesModule } from 'src/admin/roles/roles.module';
import { UsersModule } from 'src/clients/users/users.module';
import { SettingsModule } from 'src/settings/settings.module';
import { QUEUE_NAMES, QUEUE_PREFIX } from './lib/constants';
import { NotificationsController } from './notifications.controller';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsService } from './notifications.service';
import { ClientNotificationsProcessor } from './processors/client-notifications.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
@Module({
  imports: [
    SettingsModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.CLIENT_NOTIFICATIONS,
      prefix: QUEUE_PREFIX,
    }),
    RolesModule,
    UsersModule,
  ],
  providers: [
    NotificationsService,
    NotificationsScheduler,
    ClientNotificationsProcessor,
    NotificationsProcessor,
  ],
  exports: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
