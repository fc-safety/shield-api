import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const ImagesValueSchema = z.object({
  urls: z.array(z.string()),
});

export const CreateAssetQuestionResponseSchema = z.object({
  value: z.union([z.string(), z.number(), ImagesValueSchema]),
  originalPrompt: z.string(),
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
