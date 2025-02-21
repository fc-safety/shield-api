import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateInspectionRoutePointSchema = z.object({
  order: z.number(),
  assetId: z.string(),
}) satisfies z.ZodType<
  NonNullable<
    Prisma.InspectionRouteUpdateInput['inspectionRoutePoints']
  >['create']
>;

export class CreateInspectionRoutePointDto extends createZodDto(
  CreateInspectionRoutePointSchema,
) {}
