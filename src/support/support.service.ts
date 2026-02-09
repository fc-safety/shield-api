import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ApiClsService } from 'src/auth/api-cls.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(
    private readonly configService: ApiConfigService,
    private readonly cls: ApiClsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Identify the user and return the payload for Help Scout Beacon.
   */
  public async identifyUser() {
    const person = this.cls.requirePerson();
    const accessGrant = this.cls.requireAccessGrant();

    const client = await this.prisma.bypassRLS().client.findFirst({
      where: { id: accessGrant.clientId },
      select: { name: true },
    });

    const { firstName, lastName, email } = person;
    const name = `${firstName} ${lastName}`.trim();

    const payload: Record<string, string> = {
      name,
      email,
    };

    if (person.position) {
      payload.jobTitle = person.position;
    }

    if (client) {
      payload.company = client.name;
    }

    const secretKey = this.configService.get('HELPSCOUT_BEACON_SECRET_KEY');
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(email)
      .digest('hex');
    payload.signature = signature;

    return payload;
  }
}
