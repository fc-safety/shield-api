import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiClsService } from './api-cls.service';
import {
  getPolicyHandlers,
  PolicyHandler,
  PolicyHandlerContext,
  PublicPolicyHandlerContext,
} from './utils/policies';

@Injectable()
export class PoliciesGuard implements CanActivate {
  logger = new Logger(PoliciesGuard.name);

  constructor(
    private reflector: Reflector,
    private cls: ApiClsService,
    private moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { private: policyHandlers, public: publicPolicyHandlers } =
      getPolicyHandlers(this.reflector, context);

    const isPublic = this.cls.get('isPublic');
    const skipAccessGrantValidation = this.cls.get('skipAccessGrantValidation');

    const request: Request = context.switchToHttp().getRequest();

    const user = this.cls.get('user');
    const accessGrant = this.cls.get('accessGrant');

    if (isPublic) {
      return true;
    }

    if (publicPolicyHandlers.length > 0) {
      const publicPolicyHandlerContext: PublicPolicyHandlerContext = {
        request,
        user,
        accessGrant,
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

    if (!accessGrant) {
      if (skipAccessGrantValidation) {
        return true;
      }

      this.logger.error(
        `Policies guard received request without access grant when \`skipAccessGrantValidation\` is false.
        This indicates a configuration error, as the auth guard should have caught this and thrown an error.`,
      );
      throw new ForbiddenException();
    }

    const policyHandlerContext: PolicyHandlerContext = {
      request,
      user,
      accessGrant,
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
