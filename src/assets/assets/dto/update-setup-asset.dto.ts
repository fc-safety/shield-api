import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';
import {
  CreateAssetQuestionResponseSchema,
  SetupAssetSchema,
} from './setup-asset.dto';

export const UpdateSetupAssetSchema = SetupAssetSchema.extend({
  setupQuestionResponses: z.object({
    updateMany: z.array(
      z.object({
        where: z.object({ id: z.string() }),
        data: CreateAssetQuestionResponseSchema,
      }),
    ),
    createMany: z.object({
      data: z.array(CreateAssetQuestionResponseSchema),
    }),
  }),
}) satisfies z.Schema<Prisma.AssetUpdateInput>;

export class UpdateSetupAssetDto extends createZodDto(UpdateSetupAssetSchema) {}
