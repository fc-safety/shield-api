import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateRoleSchema } from './create-role.dto';

export class UpdateRoleDto extends createZodDto(
  CreateRoleSchema.partial().extend({
    clientAssignable: z.boolean().optional(), // remove default value (https://zod.dev/v4/changelog?id=defaults-applied-within-optional-fields)
  }),
) {}
