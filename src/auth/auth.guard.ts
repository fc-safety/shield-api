import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import { isIPv4, isIPv6 } from 'net';
import { getViewContext } from 'src/common/utils';
import { AuthService } from './auth.service';
import {
  CHECK_PUBLIC_POLICIES_KEY,
  PolicyHandler,
  PublicPolicyHandlerContext,
} from './policies.guard';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  logger = new Logger(AuthGuard.name);

  constructor(
    private reflector: Reflector,
    private cls: ClsService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const publicPolicyHandlers =
      this.reflector.getAllAndOverride<
        PolicyHandler<PublicPolicyHandlerContext>[]
      >(CHECK_PUBLIC_POLICIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const allowPublic = isPublic || publicPolicyHandlers.length > 0;

    const request = context.switchToHttp().getRequest<Request>();

    this.cls.set('viewContext', getViewContext(request));
    this.cls.set('useragent', request.headers['user-agent']);
    if (request.ip && isIPv4(request.ip)) {
      this.cls.set('ipv4', request.ip);
    }
    if (request.ip && isIPv6(request.ip)) {
      this.cls.set('ipv6', request.ip);
    }

    const token = this.authService.extractTokenFromRequest(request);

    const { isValid, user } = await this.authService.validateJwtToken(token, {
      allowPublic: allowPublic,
    });

    if (!isValid) {
      throw new UnauthorizedException();
    }

    if (user) {
      request.user = user;
      this.cls.set('user', user);
    }

    return true;
  }
}
