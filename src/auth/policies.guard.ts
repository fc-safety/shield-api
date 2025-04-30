import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './auth.guard';
import { TPermission, TResource } from './permissions';
import { StatelessUser } from './user.schema';

export interface PolicyHandlerContext {
  request: Request;
  user: StatelessUser;
  moduleRef: ModuleRef;
}

export interface PublicPolicyHandlerContext
  extends Omit<PolicyHandlerContext, 'user'> {
  user?: PolicyHandlerContext['user'];
}

interface IPolicyHandler<TContext> {
  handle(context: TContext): boolean | Promise<boolean>;
}

type PolicyHandlerCallback<TContext> = (
  context: TContext,
) => boolean | Promise<boolean>;

export type PolicyHandler<TContext> =
  | IPolicyHandler<TContext>
  | PolicyHandlerCallback<TContext>;

export const CHECK_POLICIES_KEY = 'check_policy';
export const CHECK_PUBLIC_POLICIES_KEY = 'check_public_policy';
/**
 * A decorator that runs a set of policy handlers.
 *
 * A policy handler is a function that takes a PolicyHandlerContext and returns a boolean.
 * The handler should return true if the policy is satisfied, and false otherwise.
 *
 * The request is denied if any of the handlers return false.
 *
 * @param handlers - The policy handlers to run.
 * @returns A decorator that sets the CHECK_POLICIES_KEY metadata.
 */
export const CheckPolicies = (
  ...handlers: PolicyHandler<PolicyHandlerContext>[]
) => SetMetadata(CHECK_POLICIES_KEY, handlers);

export const CheckPublicPolicies = (
  ...handlers: PolicyHandler<PublicPolicyHandlerContext>[]
) => SetMetadata(CHECK_PUBLIC_POLICIES_KEY, handlers);

export const CheckIsAuthenticated = () =>
  CheckPolicies((context) => !!context.user);

/**
 * A decorator that checks if the user has the specified permissions.
 *
 * @param permissions - An array of permissions that the user must have.
 * @param mode - Determines the required match for permissions.
 *               'all' means the user must have all specified permissions,
 *               'any' means the user must have at least one of the specified permissions.
 *               Defaults to 'all'.
 */
export const CheckPermissions = (
  permissions: TPermission[],
  mode?: 'all' | 'any',
) => CheckPolicies((context) => context.user.hasPermissions(permissions, mode));

/**
 * A policy handler that checks if the user has the required permissions
 * to perform the specified action on the given resource.
 *
 * @param resource - The resource to check permissions for.
 * @returns A policy handler that takes a PolicyHandlerContext and returns a boolean.
 */
export const handleResourcePermissionsPolicy =
  (resource: TResource) =>
  ({ request, user }: PolicyHandlerContext) => {
    switch (request.method) {
      case 'POST':
        return user.canCreate(resource);
      case 'PUT':
      case 'PATCH':
        return user.canUpdate(resource);
      case 'DELETE':
        return user.canDelete(resource);
      case 'GET':
      default:
        return user.canRead(resource);
    }
  };

/**
 * A decorator that checks if the user has the required permissions
 * to perform the current action on the given resource.
 *
 * The permissions are determined by the HTTP method and the resource:
 * - POST: canCreate
 * - PUT/PATCH: canUpdate
 * - DELETE: canDelete
 * - GET: canRead
 *
 * @param resource - The resource to check permissions for.
 * @returns A decorator that sets the CHECK_POLICIES_KEY metadata.
 */
export const CheckResourcePermissions = (resource: TResource) =>
  CheckPolicies(handleResourcePermissionsPolicy(resource));

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // getAllAndOverride prefers method-level policies over class-level policies.
    const policyHandlers =
      this.reflector.getAllAndOverride<PolicyHandler<PolicyHandlerContext>[]>(
        CHECK_POLICIES_KEY,
        [context.getHandler(), context.getClass()],
      ) || [];

    const publicPolicyHandlers =
      this.reflector.getAllAndOverride<
        PolicyHandler<PublicPolicyHandlerContext>[]
      >(CHECK_PUBLIC_POLICIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request: Request = context.switchToHttp().getRequest();
    const { user } = request;

    if (isPublic) {
      return true;
    }

    if (publicPolicyHandlers.length > 0) {
      const publicPolicyHandlerContext: PublicPolicyHandlerContext = {
        request,
        user,
        moduleRef: this.moduleRef,
      };

      const result = await this.execAllPolicyHandlers(
        publicPolicyHandlers,
        publicPolicyHandlerContext,
      );

      return result;
    }

    if (!user || policyHandlers.length === 0) {
      return false;
    }

    const policyHandlerContext: PolicyHandlerContext = {
      request,
      user,
      moduleRef: this.moduleRef,
    };

    return await this.execAllPolicyHandlers(
      policyHandlers,
      policyHandlerContext,
    );
  }

  private async execPolicyHandler<TContext>(
    handler: PolicyHandler<TContext>,
    context: TContext,
  ) {
    if (typeof handler === 'function') {
      return await handler(context);
    }
    return await handler.handle(context);
  }

  private async execAllPolicyHandlers<TContext>(
    handlers: PolicyHandler<TContext>[],
    context: TContext,
  ) {
    return await Promise.all(
      handlers.map((handler) => this.execPolicyHandler(handler, context)),
    ).then((results) => results.every(Boolean));
  }
}
