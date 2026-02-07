import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ApiClsService } from 'src/auth/api-cls.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { SettingsService } from 'src/settings/settings.service';
import { GetStartedFormDto } from './dto/get-started-form.dto';

@Injectable()
export class LandingService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly config: ApiConfigService,
    private readonly cls: ApiClsService,
    private readonly http: HttpService,
    private readonly settings: SettingsService,
  ) {}

  async handleGetStartedFormSubmission({
    turnstileToken,
    ...data
  }: GetStartedFormDto) {
    await this.validateTurnstileToken(turnstileToken);

    const {
      data: { landingFormLeadToAddress },
    } = await this.settings.getGlobalSettings();

    this.notifications.queueEmail({
      to: [landingFormLeadToAddress],
      bcc: this.config.get('BCC_LEAD_FORM_SUBMISSION_EMAILS'),
      replyTo: data.email,
      templateName: 'new_landing_form_lead',
      templateProps: {
        timestamp: new Date(),
        formData: data,
      },
    });

    return {
      success: true,
    };
  }
  private async validateTurnstileToken(token: string) {
    const ip = this.cls.get('ipv4');
    // Validate the token by calling the
    // "/siteverify" API endpoint.
    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const payload = {
      secret: this.config.get('CLOUDFLARE_TURNSTILE_SECRET_KEY_SHIELD_LANDING'),
      response: token,
      remoteip: ip,
    };
    const result = await firstValueFrom(
      this.http.post<TurnstileResponse>(url, payload),
    );

    const outcome = result.data;
    if (!outcome.success) {
      throw new BadRequestException('Invalid turnstile token');
    }

    return outcome;
  }
}

interface TurnstileResponse {
  success: boolean;
  /**
   * A list of errors that occurred.
   */
  'error-codes': string[];
  /** ISO timestamp for the time the challenge was solved. */
  challenge_ts: string;
  /** The hostname for which the challenge was served. */
  hostname: string;
  /**
   * The customer widget identifier passed to the widget on the client side. This is
   * used to differentiate widgets using the same sitekey in analytics. Its integrity
   * is protected by modifications from an attacker. It is recommended to validate that
   * the action matches an expected value.
   */
  action?: string;
  /**
   * The customer data passed to the widget on the client side. This can be used by the
   * customer to convey state. It is integrity protected by modifications from an attacker.
   */
  cdata?: string;
}
