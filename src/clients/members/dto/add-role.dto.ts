import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const addRoleSchema = z.object({
  roleId: z.cuid2(),
  siteId: z.cuid2(),
});

export class AddRoleDto extends createZodDto(addRoleSchema) {}
