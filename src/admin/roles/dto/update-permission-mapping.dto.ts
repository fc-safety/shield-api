import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PermissionToUpdateSchema = z.object({
  id: z.string().nonempty(),
  name: z.string().nonempty(),
});

const UpdatePermissionMappingSchema = z.object({
  grant: z.array(PermissionToUpdateSchema),
  revoke: z.array(PermissionToUpdateSchema),
});

export class UpdatePermissionMappingDto extends createZodDto(
  UpdatePermissionMappingSchema,
) {}
