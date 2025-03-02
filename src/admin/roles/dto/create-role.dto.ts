import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateRoleSchema = z.object({
  name: z.string().nonempty(),
  description: z.string().optional(),
});

export class CreateRoleDto extends createZodDto(CreateRoleSchema) {}
