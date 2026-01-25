import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const addPermissionsSchema = z.object({
  permissions: z
    .array(z.string().min(1))
    .min(1, 'At least one permission is required'),
});

export class AddPermissionsDto extends createZodDto(addPermissionsSchema) {}
