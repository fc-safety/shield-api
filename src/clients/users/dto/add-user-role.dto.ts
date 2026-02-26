import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const addUserRoleSchema = z.object({
  clientId: z.cuid2(),
  siteId: z.cuid2(),
  roleId: z.cuid2(),
});

export class AddUserRoleDto extends createZodDto(addUserRoleSchema) {}
