import { startOfDay } from 'date-fns';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ClearDemoInspectionsQuerySchema = z.object({
  startDate: z
    .string()
    .optional()
    .default(startOfDay(new Date()).toISOString()),
  endDate: z.string().nullable().optional(),
  clientId: z.string().optional(),
});

export class ClearDemoInspectionsQueryDto extends createZodDto(
  ClearDemoInspectionsQuerySchema,
) {}
