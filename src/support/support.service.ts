import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ApiClsService } from 'src/auth/api-cls.service';
import { ClientsService } from 'src/clients/clients/clients.service';
import { UsersService } from 'src/clients/users/users.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(
    private readonly configService: ApiConfigService,
    private readonly cls: ApiClsService,
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
  ) {}

  /**
   * Identify the user and return the payload for Help Scout Beacon.
   */
  public async identifyUser() {
    const user = this.cls.requireUser();
    const accessGrant = this.cls.requireAccessGrant();

    const { givenName, familyName, email } = user;
    const name = `${givenName} ${familyName}`.trim();

    const payload: Record<string, string> = {
      name,
      email,
    };

    const [authUser, client] = await Promise.all([
      this.users.findOne(user.idpId).catch(() => null),
      this.prisma.bypassRLS().client.findFirst({
        where: { id: accessGrant.clientId },
        select: { name: true },
      }),
    ]);

    if (authUser?.position) {
      payload.jobTitle = authUser.position;
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
