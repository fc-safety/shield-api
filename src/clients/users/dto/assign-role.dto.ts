import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AssignRoleSchema = z.object({
  roleId: z.string(),
});
export class AssignRoleDto extends createZodDto(AssignRoleSchema) {}
