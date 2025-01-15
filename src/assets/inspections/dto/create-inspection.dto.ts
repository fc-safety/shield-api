import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { CreateAssetQuestionResponseSchema } from 'src/assets/assets/dto/setup-asset.dto';
import { z } from 'zod';

const CreateInspectionSchema = z.object({
  asset: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  status: z.enum(['PENDING', 'COMPLETE']),
  useragent: z.string(),
  ipv4: z.string().ip({ version: 'v4' }).optional(),
  ipv6: z.string().ip({ version: 'v6' }).optional(),
  latitude: z.number().safe(),
  longitude: z.number().safe(),
  locationAccuracy: z.number().safe(),
  comments: z.string().optional(),
  responses: z.object({
    createMany: z.object({
      data: z.array(CreateAssetQuestionResponseSchema),
    }),
  }),
}) satisfies z.Schema<Prisma.InspectionCreateInput>;

export class CreateInspectionDto extends createZodDto(CreateInspectionSchema) {}
