import { Body, Controller, Post } from '@nestjs/common';
import { CheckPolicies } from 'src/auth/policies.guard';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@CheckPolicies(({ user }) => user.isGlobalAdmin())
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('send-test-email')
  async sendTestEmail(@Body() body: SendTestEmailDto) {
    return this.notifications.sendEmail({
      ...body,
      subject: 'Test Email',
    });
  }
}
