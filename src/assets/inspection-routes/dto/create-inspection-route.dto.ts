import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateInspectionRouteSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  siteId: z.string().optional(),
}) satisfies z.ZodType<Prisma.InspectionRouteCreateInput>;

export class CreateInspectionRouteDto extends createZodDto(
  CreateInspectionRouteSchema,
) {}
