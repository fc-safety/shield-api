import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getViewContext } from './utils';

export const ViewCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return getViewContext(request);
  },
);
