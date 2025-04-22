import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendResetPasswordQuerySchema = z.object({
  appClientId: z.string(),
  clientId: z.string().optional(),
});

export class SendResetPasswordQueryDto extends createZodDto(
  SendResetPasswordQuerySchema,
) {}
