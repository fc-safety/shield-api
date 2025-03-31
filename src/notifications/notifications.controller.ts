import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CheckPolicies } from 'src/auth/policies.guard';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@CheckPolicies(({ user }) => user.isGlobalAdmin())
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('send-test-email')
  async sendTestEmail(
    @Body() body: SendTestEmailDto,
    @Query('template') template?: 'test' | 'new-product-request',
  ) {
    return this.notifications.sendTestEmail(body, template);
  }

  @Get('job-queues')
  async getJobQueues() {
    return this.notifications.getJobQueues();
  }

  @Post('job-queues/:queueName/retry-job/:jobId')
  async retryJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    console.debug('Retrying job', queueName, jobId);
    return this.notifications.retryJob(queueName, jobId);
  }

  @Post('job-queues/:queueName/remove-job/:jobId')
  async removeJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    return this.notifications.removeJob(queueName, jobId);
  }
}
