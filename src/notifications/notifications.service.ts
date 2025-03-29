import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CreateEmailOptions, Resend } from 'resend';
import { ApiConfigService } from 'src/config/api-config.service';
import { SettingsService } from 'src/settings/settings.service';
import type Telnyx from 'telnyx';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { NOTIFICATIONS_JOB_NAMES, QUEUE_NAMES } from './lib/constants';
import NewProductRequestTemplateReact, {
  NEW_PRODUCT_REQUEST_TEMPLATE_TEST_PROPS,
  NewProductRequestTemplateProps,
  NewProductRequestTemplateText,
} from './templates/new-product-request';
import TestTemplateReact, { TestTemplateText } from './templates/test';

type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

export type SendEmailOptions = Omit<CreateEmailOptions, 'from'> &
  Partial<Pick<CreateEmailOptions, 'from'>> &
  RequireAtLeastOne<Pick<CreateEmailOptions, 'react' | 'html' | 'text'>>;

export type SendSmsOptions = {
  to: string;
  text: string;
};

const loadTelnyxModule = async () => {
  try {
    return (await eval('import("telnyx")')) as typeof import('telnyx');
  } catch {
    return await import('telnyx');
  }
};

@Injectable()
export class NotificationsService {
  private readonly resend: Resend;
  private readonly telnyx: Promise<Telnyx>;

  constructor(
    private readonly settings: SettingsService,
    private readonly config: ApiConfigService,
    @InjectQueue(QUEUE_NAMES.SEND_NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {
    this.resend = new Resend(config.get('RESEND_API_KEY'));
    this.telnyx = loadTelnyxModule().then(
      (m) => new m.Telnyx(config.get('TELNYX_API_KEY')),
    );
  }

  async sendEmail(options: SendEmailOptions) {
    const {
      data: { systemEmailFromAddress },
    } = await this.settings.getGlobalSettings();

    const { data, error } = await this.resend.emails.send({
      from: systemEmailFromAddress,
      ...options,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async sendEmails(options: SendEmailOptions[]) {
    const {
      data: { systemEmailFromAddress },
    } = await this.settings.getGlobalSettings();

    const { data, error } = await Promise.all(
      // Make sure we don't exceed Resend's batch size limit.
      chunkArray(options, 100).map((batch) =>
        this.resend.batch.send(
          batch.map((o) => ({
            from: systemEmailFromAddress,
            ...o,
          })),
        ),
      ),
    ).then((results) => ({
      data: results.flatMap((r) => r.data),
      error: results.at(0)?.error,
    }));

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async sendSms(options: SendSmsOptions) {
    const phoneNumber = this.config.get('TELNYX_PHONE_NUMBER');
    const telnyx = await this.telnyx;

    telnyx.messages.send({
      from: phoneNumber,
      to: options.to,
      text: options.text,
      type: 'SMS',
      auto_detect: true,
      use_profile_webhooks: false,
    });
  }

  async sendTestEmail(
    sendTestEmailDto: SendTestEmailDto,
    template?: 'test' | 'new-product-request',
  ) {
    if (template === 'new-product-request') {
      return this.sendNewProductRequestEmail(
        NEW_PRODUCT_REQUEST_TEMPLATE_TEST_PROPS.productRequest,
      );
    }

    return this.sendEmail({
      ...sendTestEmailDto,
      subject: 'Test Email',
      react: TestTemplateReact(),
      text: TestTemplateText(),
    });
  }

  async queueNewProductRequestEmail(productRequestId: string) {
    await this.notificationsQueue.add(
      NOTIFICATIONS_JOB_NAMES.SEND_NEW_PRODUCT_REQUEST_EMAIL,
      {
        productRequestId,
      },
    );
  }

  async sendNewProductRequestEmail(
    productRequest: NewProductRequestTemplateProps['productRequest'],
  ) {
    const {
      data: { productRequestToAddress },
    } = await this.settings.getGlobalSettings();

    const props: NewProductRequestTemplateProps = {
      productRequest,
      frontendUrl: this.config.get('FRONTEND_URL'),
    };

    return this.sendEmail({
      to: productRequestToAddress,
      subject: 'New Product Request',
      react: NewProductRequestTemplateReact(props),
      text: NewProductRequestTemplateText(props),
    });
  }
}

function chunkArray<T>(arr: T[], batchSize: number): T[][] {
  return arr.reduce((acc: T[][], _, i: number) => {
    if (i % batchSize === 0) acc.push(arr.slice(i, i + batchSize));
    return acc;
  }, []);
}
