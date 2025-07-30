import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';
import { CreateAssetQuestionConditionSchema } from './create-asset-question-condition.dto';
import {
  BaseCreateAssetQuestionSchema,
  CreateAssetAlertCriterionSchema,
  CreateAssetQuestionSchema,
  CreateConsumableConfigSchema,
} from './create-asset-question.dto';

const UpdateAssetQuestionSchema = CreateAssetQuestionSchema.extend({
  conditions: z
    .object({
      createMany: z.object({
        data: z.array(CreateAssetQuestionConditionSchema),
      }),
      updateMany: z.array(
        z.object({
          where: z.object({ id: z.string() }),
          data: CreateAssetQuestionConditionSchema.partial(),
        }),
      ),
      deleteMany: z.array(z.object({ id: z.string() })),
    })
    .partial(),
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
  consumableConfig: z
    .object({
      create: CreateConsumableConfigSchema,
      update: CreateConsumableConfigSchema.partial(),
      delete: z.boolean().default(false),
    })
    .partial(),
  variants: z.object({
    createMany: z.object({
      data: z.array(BaseCreateAssetQuestionSchema),
    }),
    updateMany: z.array(
      z.object({
        where: z.object({ id: z.string() }),
        data: BaseCreateAssetQuestionSchema.partial(),
      }),
    ),
    deleteMany: z.array(z.object({ id: z.string() })),
  }),
}).partial() satisfies z.Schema<Prisma.AssetQuestionUpdateInput>;

export class UpdateAssetQuestionDto extends createZodDto(
  UpdateAssetQuestionSchema,
) {}
