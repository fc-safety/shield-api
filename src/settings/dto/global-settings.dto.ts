import { createZodDto } from 'nestjs-zod';
import { FromAddressSchema } from 'src/common/notifications';
import { z } from 'zod';

export const GlobalSettingsSchema = z.object({
  systemEmailFromAddress: FromAddressSchema,
  productRequestToAddress: z.string().email(),
});

export class GlobalSettingsDto extends createZodDto(GlobalSettingsSchema) {}

export const DEFAULT_GLOBAL_SETTINGS = {
  systemEmailFromAddress: 'support@notify.fc-safety.com',
  productRequestToAddress: 'orders@fc-safety.com',
} satisfies z.infer<typeof GlobalSettingsSchema>;
