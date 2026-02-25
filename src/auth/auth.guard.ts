import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { isIPv4, isIPv6 } from 'net';
import { getAccessIntent } from 'src/common/utils';
import { ApiConfigService } from 'src/config/api-config.service';
import { ApiClsService } from './api-cls.service';
import { AccessGrantException } from './auth.exception';
import { AuthService } from './auth.service';
import { StatelessUser } from './user.schema';
import { AccessGrant } from './utils/access-grants';
import { getPolicyHandlers } from './utils/policies';
import { RoleScope } from './utils/scope';

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * Decorator to mark an endpoint as public. This means the endpoint is accessible to unauthenticated users.
 *
 * @returns A decorator that sets the IS_PUBLIC_KEY metadata.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const SKIP_ACCESS_GRANT_VALIDATION_KEY = 'skipClientValidation';
/**
 * Decorator to skip client/site validation.
 * Use this for endpoints that should be accessible to authenticated users
 * who don't have a client/site assigned (e.g., new users accepting invites).
 */
export const SkipAccessGrantValidation = () =>
  SetMetadata(SKIP_ACCESS_GRANT_VALIDATION_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly cls: ApiClsService,
    private readonly config: ApiConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for endpoints marked as public (or has public policy handlers).
    const allowPublic = this.allowPublic(context);

    // Get the request from the context.
    const request = context.switchToHttp().getRequest<Request>();

    // Validate the JWT token and get user data.
    const token = this.authService.extractTokenFromRequest(request);
    const { isValid, user, reason } =
      await this.authService.validateJwtToken(token);

    // Reject if token is not valid, unless the endpoint is public.
    if (!isValid && !allowPublic) {
      throw new UnauthorizedException(reason);
    }

    // Check if the endpoint should skip access grant validation.
    const skipAccessGrantValidation = this.skipAccessGrantValidation(context);

    // Get access intent from the request header.
    const accessIntent = getAccessIntent(request);

    // Get access grant for user if it exists.
    let accessGrant: AccessGrant | null | undefined = undefined;
    if (user) {
      const accessGrantResult = await this.authService.getAccessGrantForUser(
        user,
        this.authService.extractOrganizationContextFromRequest(request),
      );

      if (
        !accessGrantResult.grant &&
        !allowPublic &&
        !skipAccessGrantValidation
      ) {
        throw new AccessGrantException(accessGrantResult);
      }

      accessGrant =
        accessGrantResult.grant && new AccessGrant(accessGrantResult.grant);

      // Validate access intent against the user's scope.
      if (accessGrant && accessIntent !== 'user') {
        if (accessGrant.scope !== RoleScope.SYSTEM) {
          throw new ForbiddenException(
            `The '${accessIntent}' access intent requires SYSTEM scope.`,
          );
        }

        if (accessIntent === 'elevated' && !request.headers['x-client-id']) {
          throw new BadRequestException(
            "The 'elevated' access intent requires the x-client-id header.",
          );
        }
      }
    }

    // Set the CLS context from the request.
    await this.setClsContextFromRequest(request, {
      user,
      accessGrant,
      isPublic: allowPublic,
      skipAccessGrantValidation,
    });

    return true;
  }

  /**
   * Checks if the request is public based on whether the endpoint is marked as public or has public policy handlers.
   *
   * @param context - The execution context
   * @returns True if the request is public, false otherwise
   */
  private allowPublic(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { public: publicPolicyHandlers } = getPolicyHandlers(
      this.reflector,
      context,
    );

    return isPublic || publicPolicyHandlers.length > 0;
  }

  private skipAccessGrantValidation(context: ExecutionContext): boolean {
    const skipAccessGrantValidation = this.reflector.getAllAndOverride<boolean>(
      SKIP_ACCESS_GRANT_VALIDATION_KEY,
      [context.getHandler(), context.getClass()],
    );
    return skipAccessGrantValidation;
  }

  /**
   * Sets the CLS context from the request.
   *
   * @param request - The request
   * @param user - The user
   */
  private async setClsContextFromRequest(
    request: Request,
    apiContext: {
      user: StatelessUser | undefined | null;
      accessGrant: AccessGrant | undefined | null;
      isPublic: boolean;
      skipAccessGrantValidation: boolean;
    },
  ) {
    const { user, accessGrant, isPublic, skipAccessGrantValidation } =
      apiContext;

    this.cls.set('isPublic', isPublic);
    this.cls.set('skipAccessGrantValidation', skipAccessGrantValidation);

    this.cls.set('accessIntent', getAccessIntent(request));
    this.cls.set('useragent', request.headers['user-agent']);
    if (request.ip && isIPv4(request.ip)) {
      this.cls.set('ipv4', request.ip);
    }
    if (request.ip && isIPv6(request.ip)) {
      this.cls.set('ipv6', request.ip);
    }

    if (user) {
      this.cls.set('user', user);
      const person = await this.authService.savePersonFromUserData(user);
      this.cls.set('person', person);
    }

    if (accessGrant) {
      this.cls.set('accessGrant', accessGrant);
    }
  }
}
