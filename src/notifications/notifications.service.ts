import { Injectable } from '@nestjs/common';
import { CreateEmailOptions, Resend } from 'resend';
import { ApiConfigService } from 'src/config/api-config.service';
import { SettingsService } from 'src/settings/settings.service';
import TestTemplate from './templates/test';

@Injectable()
export class NotificationsService {
  private readonly resend: Resend;

  constructor(
    private readonly settings: SettingsService,
    private readonly config: ApiConfigService,
  ) {
    this.resend = new Resend(config.get('RESEND_API_KEY'));
  }

  async sendEmail(
    options: Omit<CreateEmailOptions, 'react' | 'from'> & {
      from?: CreateEmailOptions['from'];
    },
  ) {
    const {
      data: { systemEmailFromAddress },
    } = await this.settings.getGlobalSettings();

    const { data, error } = await this.resend.emails.send({
      from: systemEmailFromAddress,
      react: TestTemplate(),
      ...options,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
