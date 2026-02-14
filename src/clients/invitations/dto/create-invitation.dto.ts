import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createInvitationsSchema = z.object({
  clientId: z.cuid2().optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).optional(),
  invitations: z
    .array(
      z.object({
        email: z.email().transform((val) => val.toLowerCase()),
        siteId: z.cuid2(),
        roleId: z.cuid2(),
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (invitations) => {
        const keys = invitations.map(
          (i) => `${i.email}:${i.siteId}:${i.roleId}`,
        );
        return new Set(keys).size === keys.length;
      },
      { message: 'Duplicate invitation entries are not allowed' },
    ),
});

export class CreateInvitationsDto extends createZodDto(
  createInvitationsSchema,
) {}
