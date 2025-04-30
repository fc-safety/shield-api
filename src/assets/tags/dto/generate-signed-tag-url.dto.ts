import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GenerateSignedTagUrlSchema = z.object({
  serialNumber: z.string().regex(/^\d+$/),
  keyId: z.string().optional(),
  externalId: z.string().optional(),
});

export class GenerateSignedTagUrlDto extends createZodDto(
  GenerateSignedTagUrlSchema,
) {}
