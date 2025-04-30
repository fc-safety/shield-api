import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ValidateSignedUrlSchema = z.object({
  sn: z.string(),
  id: z.string(),
  t: z.coerce.number(),
  sig: z.string(),
  kid: z.string(),
});

export class ValidateSignedUrlDto extends createZodDto(
  ValidateSignedUrlSchema,
) {}
