import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { JOB_NAMES, QUEUE_NAMES } from './lib/constants';
import { ClientNotificationJobData } from './lib/types';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.CLIENT_NOTIFICATIONS)
    private readonly clientNotificationsQueue: Queue,
  ) {}

  @Cron('0 4 * * *')
  async handleDailyInspectionReminders() {
    this.logger.debug('--> Running daily inspection reminders...');
    const prisma = this.prisma.bypassRLS();
    const clients = await prisma.client.findMany({
      select: {
        id: true,
      },
      where: {
        status: 'ACTIVE',
      },
    });
    for (const client of clients) {
      await this.clientNotificationsQueue.add(
        JOB_NAMES.PROCESS_CLIENT_INSPECTION_REMINDERS,
        {
          clientId: client.id,
        } satisfies ClientNotificationJobData,
      );
    }
  }
}
