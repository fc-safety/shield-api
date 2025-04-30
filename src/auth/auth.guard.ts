import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Jwt, TokenExpiredError } from 'jsonwebtoken';
import { expressJwtSecret } from 'jwks-rsa';
import { ClsService } from 'nestjs-cls';
import { isIPv4, isIPv6 } from 'net';
import { getViewContext } from 'src/common/utils';
import { ApiConfigService } from 'src/config/api-config.service';
import {
  CHECK_PUBLIC_POLICIES_KEY,
  PolicyHandler,
  PublicPolicyHandlerContext,
} from './policies.guard';
import { buildUserFromToken } from './user.schema';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  logger = new Logger(AuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private config: ApiConfigService,
    private reflector: Reflector,
    private cls: ClsService,
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

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      if (allowPublic) {
        return true;
      }

      throw new UnauthorizedException();
    }
    try {
      const jwt: Jwt = this.jwtService.decode(token, {
        complete: true,
      });
      const secret = await new Promise<string>((resolve, reject) =>
        expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: this.config.get('AUTH_JWKS_URI'),
        })(request, jwt.header, jwt.payload, (e, key) => {
          if (e) {
            reject(e);
          } else if (!key) {
            reject('No key/secret found.');
          } else {
            resolve(key.toString());
          }
        }),
      );
      const payload = await this.jwtService.verifyAsync(token, {
        secret: secret,
        issuer: this.config.get('AUTH_ISSUER'),
        audience: this.config.get('AUTH_AUDIENCE'),
      });

      const user = buildUserFromToken(payload);

      request.user = user;
      this.cls.set('user', user);
      this.cls.set('useragent', request.headers['user-agent']);
      if (request.ip && isIPv4(request.ip)) {
        this.cls.set('ipv4', request.ip);
      }
      if (request.ip && isIPv6(request.ip)) {
        this.cls.set('ipv6', request.ip);
      }
    } catch (e) {
      if (!(e instanceof TokenExpiredError)) {
        this.logger.error('Error validating JWT token', e);
      }

      if (allowPublic) {
        return true;
      }

      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
