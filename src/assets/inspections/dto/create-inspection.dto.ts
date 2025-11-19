import { createZodDto } from 'nestjs-zod';
import { CreateAssetQuestionResponseSchema } from 'src/assets/assets/dto/setup-asset.dto';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const CreateInspectionSchema = z.object({
  legacyLogId: z.string().optional().nullable(),
  asset: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  status: z.enum(['PENDING', 'COMPLETE']),
  useragent: z.string(),
  ipv4: z.ipv4().nullable().optional(),
  ipv6: z.ipv6().nullable().optional(),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  locationAccuracy: z.number().nullable(),
  comments: z.string().optional(),
  responses: z.object({
    createMany: z.object({
      data: z.array(CreateAssetQuestionResponseSchema),
    }),
  }),
}) satisfies z.Schema<Prisma.InspectionCreateInput>;

export class CreateInspectionDto extends createZodDto(CreateInspectionSchema) {}
