import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GenerateSignedTagUrlSchema = z.object({
  serialNumber: z.string().regex(/^[A-Za-z0-9_-]*\d+$/),
  keyId: z.string().optional(),
  externalId: z.string().optional(),
});

export class GenerateSignedTagUrlDto extends createZodDto(
  GenerateSignedTagUrlSchema,
) {}
