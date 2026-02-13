import { createZodDto } from 'nestjs-zod';
import { VALID_CAPABILITIES } from 'src/auth/utils/capabilities';
import { RoleScope } from 'src/auth/utils/scope';
import { NotificationGroupIds } from 'src/notifications/notification-types';
import { z } from 'zod';

export const CreateRoleSchema = z.object({
  name: z.string().nonempty(),
  description: z.string().optional(),
  scope: z.enum(RoleScope).default(RoleScope.SITE),
  capabilities: z
    .array(z.enum(VALID_CAPABILITIES as [string, ...string[]]))
    .default([]),
  notificationGroups: z.array(z.enum(NotificationGroupIds)).optional(),
  clientAssignable: z
    .boolean()
    .optional()
    .describe('Indicates whether clients can assign this role to users.')
    .default(false),
});

export class CreateRoleDto extends createZodDto(CreateRoleSchema) {}
