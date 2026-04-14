import { z } from 'zod';

const assignmentSchema = z
  .object({
    roleId: z.cuid2(),
    siteId: z.cuid2(),
  })
  .strict();

const legacyShape = z
  .object({
    email: z.email().transform((val) => val.toLowerCase()),
    roleId: z.cuid2(),
    siteId: z.cuid2(),
    expiresInDays: z.coerce.number().int().min(1).max(30).optional(),
  })
  .strict();

const multiShape = z
  .object({
    email: z.email().transform((val) => val.toLowerCase()),
    assignments: z
      .array(assignmentSchema)
      .min(1)
      .max(100)
      .refine(
        (assignments) => {
          const keys = assignments.map((a) => `${a.roleId}:${a.siteId}`);
          return new Set(keys).size === keys.length;
        },
        { message: 'Duplicate role/site assignments are not allowed' },
      ),
    expiresInDays: z.coerce.number().int().min(1).max(30).optional(),
  })
  .strict();

/**
 * `kind` discriminates the response shape returned by the controller:
 * `'single'` returns the lone invitation object; `'multi'` returns the array.
 * It's part of the parsed contract, not an internal flag.
 */
export const inviteMemberSchema = z
  .union([legacyShape, multiShape])
  .transform((val) => {
    if ('assignments' in val) {
      return {
        email: val.email,
        assignments: val.assignments,
        expiresInDays: val.expiresInDays,
        kind: 'multi' as const,
      };
    }
    return {
      email: val.email,
      assignments: [{ roleId: val.roleId, siteId: val.siteId }],
      expiresInDays: val.expiresInDays,
      kind: 'single' as const,
    };
  });

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
