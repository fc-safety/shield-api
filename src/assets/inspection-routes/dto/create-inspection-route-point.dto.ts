import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const CreateInspectionRoutePointSchema = z.object({
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
