import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const BulkGenerateSignedTagUrlSchema = z
  .object({
    method: z.enum(['sequential', 'manual']),
    serialNumbers: z.array(z.string().regex(/^[A-Za-z0-9_-]*\d+$/)).optional(),
    serialNumberRangeStart: z
      .string()
      .regex(/^[A-Za-z0-9_-]*\d+$/)
      .optional(),
    serialNumberRangeEnd: z
      .string()
      .regex(/^[A-Za-z0-9_-]*\d+$/)
      .optional(),
    keyId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === 'sequential') {
      if (!data.serialNumberRangeStart || !data.serialNumberRangeEnd) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Serial number range start and end are required for sequential method',
        });
      }
    }

    if (
      data.method === 'sequential' &&
      data.serialNumberRangeStart &&
      data.serialNumberRangeEnd
    ) {
      const startMatch = data.serialNumberRangeStart.match(/^(.*?)(\d+)$/);
      const endMatch = data.serialNumberRangeEnd.match(/^(.*?)(\d+)$/);
      const startPrefix = startMatch?.[1] ?? '';
      const endPrefix = endMatch?.[1] ?? '';

      if (startPrefix !== endPrefix) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Serial number range start and end must have the same prefix',
        });
      }

      const startNum = parseInt(startMatch?.[2] ?? '0');
      const endNum = parseInt(endMatch?.[2] ?? '0');

      if (startNum > endNum) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Serial number range start must not be greater than range end',
        });
      }

      if (endNum - startNum + 1 > 100_000) {
        ctx.addIssue({
          code: 'custom',
          message: 'Sequential range cannot exceed 100,000 serial numbers',
        });
      }
    }

    if (data.method === 'manual') {
      if (!data.serialNumbers) {
        ctx.addIssue({
          code: 'custom',
          message: 'Serial numbers are required for manual method',
        });
      }
    }
  });

export class BulkGenerateSignedTagUrlDto extends createZodDto(
  BulkGenerateSignedTagUrlSchema,
) {}
