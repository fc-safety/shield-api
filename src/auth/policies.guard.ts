import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from './auth.guard';
import { TPermission, TResource } from './permissions';
import { StatelessUser } from './user.schema';

export interface PolicyHandlerContext {
  request: Request;
  user: StatelessUser;
}

interface IPolicyHandler {
  handle(context: PolicyHandlerContext): boolean;
}

type PolicyHandlerCallback = (context: PolicyHandlerContext) => boolean;

export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback;

export const CHECK_POLICIES_KEY = 'check_policy';
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
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);

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
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const policyHandlers =
      this.reflector.getAllAndMerge<PolicyHandler[]>(CHECK_POLICIES_KEY, [
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

    if (!user || policyHandlers.length === 0) {
      return false;
    }

    const policyHandlerContext: PolicyHandlerContext = {
      request,
      user,
    };

    // Only one policy handler needs to be satisfied.
    return policyHandlers.some((handler) =>
      this.execPolicyHandler(handler, policyHandlerContext),
    );
  }

  private execPolicyHandler(
    handler: PolicyHandler,
    context: PolicyHandlerContext,
  ) {
    if (typeof handler === 'function') {
      return handler(context);
    }
    return handler.handle(context);
  }
}
