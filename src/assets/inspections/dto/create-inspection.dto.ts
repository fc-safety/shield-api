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
  ipv4: z.string().ip({ version: 'v4' }).optional(),
  ipv6: z.string().ip({ version: 'v6' }).optional(),
  latitude: z.number().safe().gte(-90).lte(90),
  longitude: z.number().safe().gte(-180).lte(180),
  locationAccuracy: z.number().safe(),
  comments: z.string().optional(),
  responses: z.object({
    createMany: z.object({
      data: z.array(CreateAssetQuestionResponseSchema),
    }),
  }),
}) satisfies z.Schema<Prisma.InspectionCreateInput>;

export class CreateInspectionDto extends createZodDto(CreateInspectionSchema) {}
