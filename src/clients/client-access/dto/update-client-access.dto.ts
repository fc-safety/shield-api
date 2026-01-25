import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateClientAccessSchema = z.object({
  siteId: z.string().min(1).optional(),
  roleId: z.string().min(1).optional(),
});

export class UpdateClientAccessDto extends createZodDto(
  updateClientAccessSchema,
) {}
