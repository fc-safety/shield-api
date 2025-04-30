import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const BulkGenerateSignedTagUrlSchema = z
  .object({
    method: z.enum(['sequential', 'manual']),
    serialNumbers: z.array(z.string().regex(/^\d+$/)).optional(),
    serialNumberRangeStart: z.string().regex(/^\d+$/).optional(),
    serialNumberRangeEnd: z.string().regex(/^\d+$/).optional(),
    keyId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === 'sequential') {
      if (!data.serialNumberRangeStart || !data.serialNumberRangeEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Serial number range start and end are required for sequential method',
        });
      }
    }

    if (data.method === 'manual') {
      if (!data.serialNumbers) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Serial numbers are required for manual method',
        });
      }
    }
  });

export class BulkGenerateSignedTagUrlDto extends createZodDto(
  BulkGenerateSignedTagUrlSchema,
) {}
