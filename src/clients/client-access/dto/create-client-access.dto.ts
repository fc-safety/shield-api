import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createClientAccessSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  siteId: z.string().min(1, 'Site ID is required'),
  roleId: z.string().min(1, 'Role ID is required'),
});

export class CreateClientAccessDto extends createZodDto(
  createClientAccessSchema,
) {}
