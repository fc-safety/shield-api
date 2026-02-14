import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { jsx } from 'react/jsx-runtime';
import { CreateEmailOptions, Resend } from 'resend';
import { ApiConfigService } from 'src/config/api-config.service';
import { SettingsService } from 'src/settings/settings.service';
import Telnyx from 'telnyx';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import {
  CLIENT_NOTIFICATIONS_JOB_NAMES,
  NOTIFICATIONS_JOB_NAMES,
  QUEUE_NAMES,
} from './lib/constants';
import {
  NotificationTemplateId,
  SendEmailJobData,
  TEMPLATE_NAME_MAP,
} from './lib/templates';
import {
  NEW_PRODUCT_REQUEST_TEMPLATE_TEST_PROPS,
  NewProductRequestTemplateProps,
} from './templates/new-product-request';

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

@Injectable()
export class NotificationsService {
  private readonly resend: Resend;
  private readonly telnyx: Telnyx;
  private readonly queues: Record<string, Queue>;
  constructor(
    private readonly settings: SettingsService,
    private readonly config: ApiConfigService,
    @InjectQueue(QUEUE_NAMES.SEND_NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CLIENT_NOTIFICATIONS)
    private readonly clientNotificationsQueue: Queue,
  ) {
    this.resend = new Resend(config.get('RESEND_API_KEY'));
    this.telnyx = new Telnyx({ apiKey: config.get('TELNYX_API_KEY') });

    this.queues = {
      [this.notificationsQueue.name]: this.notificationsQueue,
      [this.clientNotificationsQueue.name]: this.clientNotificationsQueue,
    };
  }

  async sendEmail(options: Omit<CreateEmailOptions, 'from'>) {
    const {
      data: { systemEmailFromAddress },
    } = await this.settings.getGlobalSettings();

    const { data, error } = await this.resend.emails.send({
      ...options,
      from: systemEmailFromAddress,
    } as CreateEmailOptions);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async sendEmails(options: Omit<CreateEmailOptions, 'from'>[]) {
    const {
      data: { systemEmailFromAddress },
    } = await this.settings.getGlobalSettings();

    const { data, error } = await Promise.all(
      // Make sure we don't exceed Resend's batch size limit.
      chunkArray(options, 100).map((batch) =>
        this.resend.batch.send(
          batch.map(
            (o) =>
              ({
                from: systemEmailFromAddress,
                ...o,
              }) as CreateEmailOptions,
          ),
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

    await this.telnyx.messages.send({
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
    template?: NotificationTemplateId,
  ) {
    if (template === 'new_product_request') {
      return this.sendNewProductRequestEmail(
        NEW_PRODUCT_REQUEST_TEMPLATE_TEST_PROPS.productRequest,
      );
    } else {
      return this.sendTemplateEmail({
        templateName: template ?? 'test',
        to: [sendTestEmailDto.to],
      });
    }
  }

  async sendTemplateEmail<T extends NotificationTemplateId>({
    templateName: rawTemplateName,
    subject,
    to,
    templateProps,
    replyTo,
    cc,
    bcc,
  }: {
    templateName: T;
    subject?: string;
    to: string[];
    templateProps?: React.ComponentProps<(typeof TEMPLATE_NAME_MAP)[T]>;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
  }) {
    const templateName = rawTemplateName.replace(/-/g, '_');

    const Template = TEMPLATE_NAME_MAP[templateName];

    if (!Template) {
      throw new Error(
        `Template for template name "${templateName}" is not defined.`,
      );
    }

    if (!subject && !Template.Subject) {
      throw new Error(
        `Subject for notification group "${templateName}" is not defined.`,
      );
    }

    const props = templateProps ?? Template.PreviewProps;

    const text = Template.Text(props);

    const subjectOrFn = subject ?? Template.Subject;
    let subjectValue: string;
    if (typeof subjectOrFn === 'function') {
      subjectValue = subjectOrFn(props);
    } else {
      subjectValue = subjectOrFn;
    }

    await this.sendEmail({
      subject: subjectValue,
      to,
      cc,
      bcc,
      text,
      react: jsx(Template, props),
      replyTo,
    });
  }

  async queueEmail<T extends NotificationTemplateId>(
    data: SendEmailJobData<T>,
  ) {
    await this.notificationsQueue.add(NOTIFICATIONS_JOB_NAMES.SEND_EMAIL, data);
  }

  async queueEmailBulk<T extends NotificationTemplateId>(
    data: SendEmailJobData<T>[],
  ) {
    await this.notificationsQueue.addBulk(
      data.map((d) => ({
        name: NOTIFICATIONS_JOB_NAMES.SEND_EMAIL,
        data: d,
      })),
    );
  }

  async queueNewProductRequestEmail(productRequestId: string) {
    await this.notificationsQueue.add(
      NOTIFICATIONS_JOB_NAMES.SEND_NEW_PRODUCT_REQUEST_EMAIL,
      {
        productRequestId,
      },
    );
  }

  async queueInspectionAlertTriggeredEmail(alertId: string) {
    await this.clientNotificationsQueue.add(
      CLIENT_NOTIFICATIONS_JOB_NAMES.SEND_INSPECTION_ALERT_TRIGGERED_EMAIL,
      {
        alertId,
      },
    );
  }

  async sendNewProductRequestEmail(
    productRequest: NewProductRequestTemplateProps['productRequest'],
  ) {
    const {
      data: { productRequestToAddress },
    } = await this.settings.getGlobalSettings();

    const props = {
      productRequest,
      frontendUrl: this.config.get('FRONTEND_URL'),
    } satisfies NewProductRequestTemplateProps;

    await this.notificationsQueue.add(NOTIFICATIONS_JOB_NAMES.SEND_EMAIL, {
      templateName: 'new_product_request',
      to: [productRequestToAddress],
      templateProps: props,
    } satisfies SendEmailJobData<'new_product_request'>);
  }

  async getJobQueues() {
    return Promise.all(
      Object.values(this.queues).map(async (q) => ({
        queueName: q.name,
        failedJobs: await q.getFailed(),
        waitingJobs: await q.getWaiting(),
        activeJobs: await q.getActive(),
      })),
    );
  }

  async retryJob(queueName: string, jobId: string) {
    const job = await this.queues[queueName].getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await job.retry();
  }

  async removeJob(queueName: string, jobId: string) {
    await this.queues[queueName].remove(jobId);
  }
}

function chunkArray<T>(arr: T[], batchSize: number): T[][] {
  return arr.reduce((acc: T[][], _, i: number) => {
    if (i % batchSize === 0) acc.push(arr.slice(i, i + batchSize));
    return acc;
  }, []);
}
