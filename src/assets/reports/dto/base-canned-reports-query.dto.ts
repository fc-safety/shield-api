import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const BaseCannedReportsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export class BaseCannedReportsQueryDto extends createZodDto(
  BaseCannedReportsQuerySchema,
) {}
