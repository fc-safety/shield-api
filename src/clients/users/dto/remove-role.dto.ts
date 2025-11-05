import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RemoveRoleSchema = z.object({
  roleId: z.string(),
});
export class RemoveRoleDto extends createZodDto(RemoveRoleSchema) {}
