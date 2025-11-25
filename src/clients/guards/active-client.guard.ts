import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { IS_PUBLIC_KEY } from 'src/auth/auth.guard';
import { CommonClsStore } from 'src/common/types';
import { isNil } from 'src/common/utils';
import { ClientStatus } from 'src/generated/prisma/enums';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class ActiveClientGuard implements CanActivate {
  logger = new Logger(ActiveClientGuard.name);

  constructor(
    private reflector: Reflector,
    private cls: ClsService<CommonClsStore>,
    private clientsService: ClientsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const user = this.cls.get('user');

    if (!user) {
      this.logger.warn(
        'ActiveClientGuard executed before user was set in CLS.',
      );
      return false;
    }

    const clientExternalId = user.clientId;

    const isActive = await this.isClientActive(clientExternalId);
    if (!isActive) {
      throw new ForbiddenException({
        message: 'Client is not active. Please contact support.',
        error: 'client_not_active',
        statusCode: 403,
      });
    }

    return true;
  }

  private async isClientActive(clientExternalId: string) {
    const status = await this.clientsService.getClientStatus(clientExternalId);
    if (isNil(status)) {
      return false;
    }

    // Consider both ACTIVE and LEGACY as active for now. This allows for a transitional
    // period for legacy clients to be migrated to the new system.
    return status === ClientStatus.ACTIVE || status === ClientStatus.LEGACY;
  }
}
