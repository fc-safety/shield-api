import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const listInvitationsQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']).optional(),
  clientId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export class ListInvitationsQueryDto extends createZodDto(
  listInvitationsQuerySchema,
) {}
