import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateInspectionSchema = z.object({
  asset: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  comments: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
}) satisfies z.Schema<Prisma.InspectionCreateInput>;

export class CreateInspectionDto extends createZodDto(CreateInspectionSchema) {}
