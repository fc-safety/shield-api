import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const flatEntry = z.object({
  email: z.email().transform((val) => val.toLowerCase()),
  siteId: z.cuid2(),
  roleId: z.cuid2(),
});

const nestedEntry = z.object({
  email: z.email().transform((val) => val.toLowerCase()),
  assignments: z
    .array(z.object({ siteId: z.cuid2(), roleId: z.cuid2() }))
    .min(1)
    .max(100),
});

/**
 * Accepts two shapes for `invitations`:
 *  - flat: `[{ email, siteId, roleId }]`
 *  - nested: `[{ email, assignments: [{ siteId, roleId }] }]` (preferred by UI
 *    dialogs that batch N emails × M assignments in one submit)
 * The nested shape is normalized to flat entries internally.
 */
export const createInvitationsSchema = z
  .object({
    clientId: z.cuid2().optional(),
    expiresInDays: z.coerce.number().int().min(1).max(30).optional(),
    invitations: z
      .array(z.union([flatEntry, nestedEntry]))
      .min(1)
      .max(100),
  })
  .transform((val) => {
    const flat = val.invitations.flatMap((entry) =>
      'assignments' in entry
        ? entry.assignments.map((a) => ({
            email: entry.email,
            siteId: a.siteId,
            roleId: a.roleId,
          }))
        : [entry],
    );
    return { ...val, invitations: flat };
  })
  .refine(
    (val) => {
      const keys = val.invitations.map(
        (i) => `${i.email}:${i.siteId}:${i.roleId}`,
      );
      return new Set(keys).size === keys.length;
    },
    { message: 'Duplicate invitation entries are not allowed' },
  )
  .refine((val) => val.invitations.length <= 500, {
    message: 'Too many invitations (max 500 after flattening assignments)',
  });

export class CreateInvitationsDto extends createZodDto(
  createInvitationsSchema,
) {}
