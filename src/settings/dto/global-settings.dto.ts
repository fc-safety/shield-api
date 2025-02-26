import { createZodDto } from 'nestjs-zod';
import { FromAddressSchema } from 'src/common/notifications';
import { z } from 'zod';

export const GlobalSettingsSchema = z.object({
  systemEmailFromAddress: FromAddressSchema,
});

export class GlobalSettingsDto extends createZodDto(GlobalSettingsSchema) {}

export const DEFAULT_GLOBAL_SETTINGS = {
  systemEmailFromAddress: 'no-reply@fc-safety.com',
} satisfies z.infer<typeof GlobalSettingsSchema>;
