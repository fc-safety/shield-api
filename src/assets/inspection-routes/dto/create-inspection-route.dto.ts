import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const CreateInspectionRouteSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  siteId: z.string().optional(),
}) satisfies z.ZodType<Prisma.InspectionRouteCreateInput>;

export class CreateInspectionRouteDto extends createZodDto(
  CreateInspectionRouteSchema,
) {}
