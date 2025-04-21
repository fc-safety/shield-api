import { subDays } from 'date-fns';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const BaseCannedReportsQuerySchema = z.object({
  startDate: z
    .string()
    .datetime()
    .default(subDays(new Date(), 90).toISOString()),
  endDate: z.string().datetime().default(new Date().toISOString()),
});

export class BaseCannedReportsQueryDto extends createZodDto(
  BaseCannedReportsQuerySchema,
) {}
