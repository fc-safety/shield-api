import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const removeUserRoleSchema = z.object({
  clientId: z.cuid2(),
  siteId: z.cuid2(),
  roleId: z.cuid2(),
});

export class RemoveUserRoleDto extends createZodDto(removeUserRoleSchema) {}
