import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const removeRoleSchema = z.object({
  roleId: z.cuid2(),
  siteId: z.cuid2(),
});

export class RemoveRoleDto extends createZodDto(removeRoleSchema) {}
