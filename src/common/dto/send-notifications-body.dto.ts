import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendNotificationsBodySchema = z.object({
  userIds: z.array(z.string()),
});

export class SendNotificationsBodyDto extends createZodDto(
  SendNotificationsBodySchema,
) {}
