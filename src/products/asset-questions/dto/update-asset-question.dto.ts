import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  CreateAssetAlertCriterionSchema,
  CreateAssetQuestionSchema,
} from './create-asset-question.dto';

const UpdateAssetQuestionSchema = CreateAssetQuestionSchema.extend({
  assetAlertCriteria: z
    .object({
      createMany: z.object({
        data: z.array(CreateAssetAlertCriterionSchema),
      }),
      updateMany: z.array(
        z.object({
          where: z.object({ id: z.string() }),
          data: CreateAssetAlertCriterionSchema.partial(),
        }),
      ),
      deleteMany: z.array(z.object({ id: z.string() })),
    })
    .partial(),
}).partial() satisfies z.Schema<Prisma.AssetQuestionUpdateInput>;

export class UpdateAssetQuestionDto extends createZodDto(
  UpdateAssetQuestionSchema,
) {}
