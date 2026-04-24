import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const renewInvitationSchema = z
  .object({
    expiresInDays: z.coerce.number().int().min(1).max(30).optional(),
  })
  .strict();

export class RenewInvitationDto extends createZodDto(renewInvitationSchema) {}
