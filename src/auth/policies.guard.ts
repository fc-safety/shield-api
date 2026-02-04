import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './auth.guard';
import { TCapability } from './capabilities';
import { TScope } from './scope';
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

/**
 * A decorator that checks if the user is authenticated (user object exists).
 */
export const CheckIsAuthenticated = () =>
  CheckPolicies((context) => !!context.user);

// ============================================================================
// Capability-based decorators
// ============================================================================

/**
 * A decorator that checks if the user has a specific capability.
 *
 * @param capability - The capability required.
 *
 * @example
 * @CheckCapability('manage-assets')
 * create() { ... }
 */
export const CheckCapability = (capability: TCapability) =>
  CheckPolicies(({ user }) => user.hasCapability(capability));

/**
 * A decorator that checks if the user has any of the specified capabilities.
 *
 * @param capabilities - Array of capabilities, user needs at least one.
 *
 * @example
 * @CheckAnyCapability('perform-inspections', 'view-reports')
 * findAll() { ... }
 */
export const CheckAnyCapability = (...capabilities: TCapability[]) =>
  CheckPolicies(({ user }) => user.hasAnyCapability(capabilities));

/**
 * A decorator that checks if the user has all of the specified capabilities.
 *
 * @param capabilities - Array of capabilities, user needs all of them.
 *
 * @example
 * @CheckAllCapabilities('manage-assets', 'manage-routes')
 * createWithRoute() { ... }
 */
export const CheckAllCapabilities = (...capabilities: TCapability[]) =>
  CheckPolicies(({ user }) => user.hasAllCapabilities(capabilities));

// ============================================================================
// Scope-based decorators
// ============================================================================

/**
 * A decorator that checks if the user's scope is at least as permissive as required.
 *
 * Scope hierarchy (most to least permissive):
 * SYSTEM > GLOBAL > CLIENT > SITE_GROUP > SITE > SELF
 *
 * @param scope - The minimum required scope.
 *
 * @example
 * @CheckScope('CLIENT')
 * findAllSites() { ... }  // Requires CLIENT, GLOBAL, or SYSTEM scope
 */
export const CheckScope = (scope: TScope) =>
  CheckPolicies(({ user }) => user.scopeAllows(scope));

/**
 * A decorator that checks if the user is a super admin (SYSTEM or GLOBAL scope).
 *
 * @example
 * @CheckSuperAdmin()
 * dangerousOperation() { ... }
 */
export const CheckSystemAdmin = () =>
  CheckPolicies(({ user }) => user.isSystemAdmin());

/**
 * A decorator that checks if the user is a global admin (GLOBAL or SYSTEM scope).
 *
 * @example
 * @CheckGlobalAdmin()
 * crossClientOperation() { ... }
 */
export const CheckGlobalAdmin = () =>
  CheckPolicies(({ user }) => user.isGlobalAdmin());

/**
 * A decorator that checks if the user is a client admin (CLIENT scope or above).
 *
 * @example
 * @CheckClientAdmin()
 * manageClientUsers() { ... }
 */
export const CheckClientAdmin = () =>
  CheckPolicies(({ user }) => user.isClientAdmin());

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
