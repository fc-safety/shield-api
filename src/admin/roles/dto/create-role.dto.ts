import { createZodDto } from 'nestjs-zod';
import { NotificationGroupIds } from 'src/notifications/notification-types';
import { z } from 'zod';

export const CreateRoleSchema = z.object({
  name: z.string().nonempty(),
  description: z.string().optional(),
  notificationGroups: z.array(z.enum(NotificationGroupIds)).optional(),
});

export class CreateRoleDto extends createZodDto(CreateRoleSchema) {}
