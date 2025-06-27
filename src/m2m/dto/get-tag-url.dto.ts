import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GetTagUrlSchema = z.object({
  legacyTagId: z
    .string()
    .describe('The legacy tag ID to get the URL for.')
    .nullable(),
});

export class GetTagUrlDto extends createZodDto(GetTagUrlSchema) {}
