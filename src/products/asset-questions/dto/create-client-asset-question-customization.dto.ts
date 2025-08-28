import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const createClientAssetQuestionCustomizationSchema = z.object({
  assetQuestion: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  enabled: z.boolean(),
}) satisfies z.ZodType<Prisma.ClientAssetQuestionCustomizationCreateInput>;

export class CreateClientAssetQuestionCustomizationDto extends createZodDto(
  createClientAssetQuestionCustomizationSchema,
) {}
