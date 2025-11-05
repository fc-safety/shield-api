import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AddRoleSchema = z.object({
  roleId: z.string(),
});
export class AddRoleDto extends createZodDto(AddRoleSchema) {}
