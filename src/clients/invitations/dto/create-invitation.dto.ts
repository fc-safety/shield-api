import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createInvitationSchema = z.object({
  clientId: z.cuid2().optional(),
  email: z.email().optional(),
  roleId: z.cuid2().optional(),
  siteId: z.cuid2().optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).optional(),
});

export class CreateInvitationDto extends createZodDto(createInvitationSchema) {}
