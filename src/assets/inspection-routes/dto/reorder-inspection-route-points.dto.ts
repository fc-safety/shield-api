import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ReorderInspectionRoutePointsSchema = z.object({
  id: z.string(),
  order: z.number(),
});

export class ReorderInspectionRoutePointsDto extends createZodDto(
  ReorderInspectionRoutePointsSchema,
) {}
