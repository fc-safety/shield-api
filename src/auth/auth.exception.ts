import { ForbiddenException } from '@nestjs/common';
import { TAccessGrantResult } from './auth.types';

export class AccessGrantException extends ForbiddenException {
  constructor(result: TAccessGrantResult & { grant?: never }) {
    super({
      message: result.message,
      code: result.reason.toUpperCase(),
      details: result.details,
    });
  }
}
