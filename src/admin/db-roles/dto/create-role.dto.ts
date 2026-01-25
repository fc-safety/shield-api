import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  clientId: z.string().optional(),
  isSystem: z.boolean().optional().default(false),
});

export class CreateRoleDto extends createZodDto(createRoleSchema) {}
