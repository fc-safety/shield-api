import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SetRolesSchema = z.object({
  roleIds: z.array(z.string()).min(0),
});
export class SetRolesDto extends createZodDto(SetRolesSchema) {}
