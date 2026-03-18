import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  NOTIFICATIONS_JOB_NAMES,
  QUEUE_NAMES,
  QUEUE_PREFIX,
} from '../lib/constants';
import { SendEmailJobData } from '../lib/templates';
import { SendNewProductRequestEmailJobData } from '../lib/types';
import { NotificationsService } from '../notifications.service';

@Processor(QUEUE_NAMES.SEND_NOTIFICATIONS, {
  prefix: QUEUE_PREFIX,
  // Completed jobs are retained so BullMQ can reject duplicate jobIds.
  // 32 days covers the monthly scheduler period. count caps Redis memory;
  // at ~2 KB/job, 10 000 jobs ≈ 20 MB. Monitor `USED_MEMORY` if client count grows.
  removeOnComplete: {
    age: 32 * 24 * 3600,
    count: 10000,
  },
  removeOnFail: {
    age: 24 * 3600 * 7, // keep up to 7 days
  },
})
export class NotificationsProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Received shutdown signal: ${signal}. Closing ${NotificationsProcessor.name}...`,
    );
    await this.worker.close().catch((e) => this.logger.warn(e));
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error('Processor error', { error });
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.debug('Processor ready');
  }

  @OnWorkerEvent('active')
  onActive(job: Job<unknown>) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}...`);
  }

  async process(job: Job<unknown>) {
    switch (job.name) {
      case NOTIFICATIONS_JOB_NAMES.SEND_NEW_PRODUCT_REQUEST_EMAIL:
        return await this.sendNewProductRequestEmail(
          job as Job<SendNewProductRequestEmailJobData>,
        );
      case NOTIFICATIONS_JOB_NAMES.SEND_EMAIL:
        return await this.sendEmail(job as Job<SendEmailJobData<any>>);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  //   Job handlers
  private async sendNewProductRequestEmail(
    job: Job<SendNewProductRequestEmailJobData>,
  ) {
    const { productRequestId } = job.data;
    const productRequest = await this.prisma
      .bypassRLS()
      .productRequest.findUniqueOrThrow({
        where: { id: productRequestId },
        include: {
          requestor: true,
          client: true,
          site: true,
          productRequestItems: {
            include: {
              product: true,
            },
          },
        },
      });
    await this.notificationsService.sendNewProductRequestEmail(productRequest);
  }

  /**
   * Sends an email.
   *
   * @param job The job to send the email for.
   * @returns The result of the job.
   */
  private async sendEmail(job: Job<SendEmailJobData<any>>) {
    await this.notificationsService.sendTemplateEmail(job.data);
  }
}
