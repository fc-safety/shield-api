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
      defaultJobOptions: {
        // TODO: Determine appropriate number of attempts and delay. We don't want a parent job
        // to repeat if it's already started adding children jobs to the next queue (aka sending
        // duplicate notifications).
        //
        // This amounts to roughly half a day of retries, following this formula:
        // 2^(attempts - 1) * delay ~= 13.65 hours
        // attempts: 15,
        // backoff: {
        //   type: 'exponential',
        //   delay: 3000,
        // },
      },
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.SEND_NOTIFICATIONS,
      prefix: QUEUE_PREFIX,
      defaultJobOptions: {
        // attempts: 15,
        // backoff: {
        //   type: 'exponential',
        //   delay: 3000,
        // },
      },
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
