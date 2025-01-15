import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateAssetQuestionResponseSchema = z.object({
  value: z.union([z.string().nonempty(), z.number().safe()]),
  assetQuestionId: z.string().nonempty(),
});

export const SetupAssetSchema = z.object({
  setupQuestionResponses: z.object({
    createMany: z.object({
      data: z.array(CreateAssetQuestionResponseSchema),
    }),
  }),
}) satisfies z.Schema<Prisma.AssetUpdateInput>;

export class SetupAssetDto extends createZodDto(SetupAssetSchema) {}
