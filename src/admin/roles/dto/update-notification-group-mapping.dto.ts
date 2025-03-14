import { createZodDto } from 'nestjs-zod';
import { NotificationGroupIds } from 'src/notifications/notification-types';
import { z } from 'zod';

const UpdateNotificationGroupMappingSchema = z.object({
  notificationGroupIds: z.array(z.enum(NotificationGroupIds)),
});

export class UpdateNotificationGroupMappingDto extends createZodDto(
  UpdateNotificationGroupMappingSchema,
) {}
