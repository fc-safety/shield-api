import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  NOTIFICATIONS_JOB_NAMES,
  QUEUE_NAMES,
  QUEUE_PREFIX,
} from '../lib/constants';
import { SendNewProductRequestEmailJobData } from '../lib/types';
import { NotificationsService } from '../notifications.service';

@Processor(QUEUE_NAMES.SEND_NOTIFICATIONS, { prefix: QUEUE_PREFIX })
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
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
    this.logger.debug(`Processing job ${job.id} of type ${job.name}...`, {
      jobData: job.data,
    });
  }

  async process(job: Job<unknown>) {
    switch (job.name) {
      case NOTIFICATIONS_JOB_NAMES.SEND_NEW_PRODUCT_REQUEST_EMAIL:
        return await this.sendNewProductRequestEmail(
          job as Job<SendNewProductRequestEmailJobData>,
        );
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
}
