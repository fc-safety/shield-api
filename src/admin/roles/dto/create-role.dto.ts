import { createZodDto } from 'nestjs-zod';
import { NotificationGroupIds } from 'src/notifications/notification-types';
import { z } from 'zod';

export const CreateRoleSchema = z.object({
  name: z.string().nonempty(),
  description: z.string().optional(),
  notificationGroups: z.array(z.enum(NotificationGroupIds)).optional(),
  clientAssignable: z
    .boolean()
    .optional()
    .describe('Indicates whether clients can assign this role to users.')
    .default(false),
});

export class CreateRoleDto extends createZodDto(CreateRoleSchema) {}
