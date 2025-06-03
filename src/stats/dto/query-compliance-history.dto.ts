import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const QueryComplianceHistorySchema = z.object({
  months: z.coerce.number().min(1).max(12),
});

export class QueryComplianceHistoryDto extends createZodDto(
  QueryComplianceHistorySchema,
) {}
