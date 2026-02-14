import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.email().transform((val) => val.toLowerCase()),
  roleId: z.cuid2(),
  siteId: z.cuid2(),
  expiresInDays: z.coerce.number().int().min(1).max(30).optional(),
});

export class InviteMemberDto extends createZodDto(inviteMemberSchema) {}
