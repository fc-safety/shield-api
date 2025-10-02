import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GenerateDemoInspectionsSchema = z.object({
  clientId: z.string().optional(),
  monthsBack: z.number().min(12).max(24).optional().default(13),
  resetInspections: z.boolean().optional(),
});

export class GenerateDemoInspectionsDto extends createZodDto(
  GenerateDemoInspectionsSchema,
) {}
