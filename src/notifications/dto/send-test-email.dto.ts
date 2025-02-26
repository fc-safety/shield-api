import { createZodDto } from 'nestjs-zod';
import { FromAddressSchema } from 'src/common/notifications';
import { z } from 'zod';

const SendTestEmailSchema = z.object({
  to: z.string().email(),
  from: FromAddressSchema.optional(),
});

export class SendTestEmailDto extends createZodDto(SendTestEmailSchema) {}
